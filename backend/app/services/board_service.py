"""인계보드 서비스 — open/hold 카드를 카테고리별로 반환."""
from datetime import date as Date
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.log import CardCategory, CardLink, Log, LogCard
from app.models.user import User
from app.schemas.log import BoardCardOut, BoardCategoryOut


def get_board(
    db: Session,
    team: Optional[str] = None,
    date_from: Optional[Date] = None,
    date_to: Optional[Date] = None,
) -> list[BoardCategoryOut]:
    """open/hold 카드 전체를 카테고리별로 그룹핑하여 반환.

    - team: 로그 작성자의 소속 팀(A/B/C/D/day) 필터
    - date_from / date_to: 일지 날짜 범위 필터
    - 카테고리 정렬: 진행중(open+hold) 카드 수 내림차순, 동점이면 sort_order 오름차순
    - 카드 없는 카테고리도 포함 (count=0)
    """

    # ── 1. open/hold 카드 조회 ──────────────────────────────────────────────
    # last_edited_by 이름은 editor_ids 일괄 조회로 별도 처리
    stmt = (
        select(
            LogCard,
            Log.date.label("log_date"),
            Log.shift_type.label("log_shift_type"),
        )
        .join(Log, Log.id == LogCard.log_id)
        .join(User, User.id == Log.author_id)
        .where(
            LogCard.is_deleted.is_(False),
            Log.is_deleted.is_(False),
            LogCard.status.notin_(["done", "cancelled"]),
        )
    )

    if team:
        stmt = stmt.where(User.team == team)
    if date_from:
        stmt = stmt.where(Log.date >= date_from)
    if date_to:
        stmt = stmt.where(Log.date <= date_to)

    rows = db.execute(stmt).all()

    # ── 2. last_edited_by 이름 일괄 조회 ────────────────────────────────────
    editor_ids = {row.LogCard.last_edited_by for row in rows if row.LogCard.last_edited_by}
    editor_map: dict[int, str] = {}
    if editor_ids:
        editors = db.scalars(select(User).where(User.id.in_(editor_ids))).all()
        editor_map = {u.id: u.name for u in editors}

    # ── 3. 카드별 인계 횟수 (CardLink) ──────────────────────────────────────
    card_ids = [row.LogCard.id for row in rows]
    handover_map: dict[int, int] = {cid: 0 for cid in card_ids}
    if card_ids:
        link_counts = db.execute(
            select(CardLink.source_card_id, func.count(CardLink.id).label("cnt"))
            .where(CardLink.source_card_id.in_(card_ids))
            .group_by(CardLink.source_card_id)
        ).all()
        for lc in link_counts:
            handover_map[lc.source_card_id] = lc.cnt

    # ── 4. 활성 카테고리 목록 ────────────────────────────────────────────────
    categories = db.scalars(
        select(CardCategory)
        .where(CardCategory.is_active.is_(True))
        .order_by(CardCategory.sort_order)
    ).all()

    # ── 5. 카테고리별 카드 분류 ──────────────────────────────────────────────
    cat_cards: dict[int | None, list[BoardCardOut]] = {cat.id: [] for cat in categories}
    uncategorized: list[BoardCardOut] = []

    for row in rows:
        card = row.LogCard
        card_out = BoardCardOut(
            id=card.id,
            log_id=card.log_id,
            log_date=str(row.log_date),
            log_shift_type=row.log_shift_type,
            title=card.title,
            status=card.status,
            category_id=card.category_id,
            category_name=None,
            category_color=None,
            last_edited_by=card.last_edited_by,
            last_edited_by_name=editor_map.get(card.last_edited_by) if card.last_edited_by else None,
            handover_count=handover_map.get(card.id, 0),
        )
        if card.category_id in cat_cards:
            cat_cards[card.category_id].append(card_out)
        else:
            uncategorized.append(card_out)

    # ── 6. 카테고리 이름/색상 채우기 + 정렬 ────────────────────────────────
    sort_order_map = {cat.id: cat.sort_order for cat in categories}
    result: list[BoardCategoryOut] = []

    for cat in categories:
        cards = cat_cards.get(cat.id, [])
        for c in cards:
            c.category_name = cat.name
            c.category_color = cat.color
        result.append(BoardCategoryOut(
            id=cat.id,
            name=cat.name,
            color=cat.color,
            count=len(cards),
            cards=cards,
        ))

    # 미분류 카드가 있으면 별도 컬럼으로 추가
    if uncategorized:
        result.append(BoardCategoryOut(
            id=0,
            name="미분류",
            color="#94a3b8",
            count=len(uncategorized),
            cards=uncategorized,
        ))

    # 카드 수 내림차순 정렬, 동점이면 sort_order 오름차순
    result.sort(key=lambda c: (-c.count, sort_order_map.get(c.id, 9999)))

    return result
