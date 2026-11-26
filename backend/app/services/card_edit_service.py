"""Card edit, link search, and chain helpers."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.log import CardLink, Log, LogCard
from app.models.user import User
from app.schemas.log import CardChainNode, CardLinkResult, CardUpdate, LogCardOut
from app.services.card_chain_utils import (
    build_adjacency,
    build_chain_tree,
    get_component_for_card,
    load_chain_card_map,
    load_ordered_links,
    pick_root_card_id,
)
from app.services import inquiry_auto_service, work_thread_sync
from app.services.card_service import _card_to_out
from app.services.notification_service import create_notification
from app.utils.html_links import extract_card_ids_in_order


def _sync_links(db: Session, card_id: int, content: str | None, user_id: int) -> None:
    target_ids = extract_card_ids_in_order(content)
    db.execute(CardLink.__table__.delete().where(CardLink.source_card_id == card_id))
    for tid in target_ids:
        if tid != card_id:
            db.add(CardLink(source_card_id=card_id, target_card_id=tid, created_by=user_id))


def apply_card_edit(db: Session, card: LogCard, user_id: int, data: CardUpdate, sync=_sync_links) -> None:
    """제목·본문·분류를 반영하고 수정자·시각을 남긴 뒤 #카드 링크를 동기화한다 (커밋은 호출자)."""
    if data.title is not None:
        card.title = data.title
    if data.content is not None:
        card.content = data.content
    if "category_id" in data.model_fields_set:
        card.category_id = data.category_id

    card.last_edited_by = user_id
    card.updated_at = datetime.now(timezone.utc)
    db.flush()
    sync(db, card.id, card.content, user_id)


def notify_card_edit(db: Session, card: LogCard, user_id: int) -> None:
    """일지 작성자가 수정자와 다르면 작성자에게 알림(과 멘션 알림)을 보낸다."""
    log = db.get(Log, card.log_id)
    if log and log.author_id != user_id:
        editor = db.get(User, user_id)
        editor_name = editor.name if editor else "사용자"
        create_notification(
            db,
            user_id=log.author_id,
            type="card",
            body=f"{editor_name} 님이 일지의 카드를 수정했습니다.",
            ref_type="card",
            ref_id=card.id,
        )

        from app.services.notification_service import create_mention_notifications

        create_mention_notifications(
            db, card.content or card.title, user_id, editor_name, "log", log.id
        )


def update_card(db: Session, card_id: int, user_id: int, data: CardUpdate) -> LogCardOut | None:
    card = db.get(LogCard, card_id)
    if not card or card.is_deleted:
        return None

    old_category = card.category_id
    apply_card_edit(db, card, user_id, data)
    if card.category_id != old_category:  # 완료 카드를 문의 분류로 바꾸면 문의사항 한 건
        inquiry_auto_service.on_cards_done(db, [card.id], user_id)
    db.commit()
    db.refresh(card)
    notify_card_edit(db, card, user_id)
    return _card_to_out(card, db)


def search_links(db: Session, q: str, user_id: int, limit: int = 20) -> list[CardLinkResult]:
    """링크 넣기용 카드 검색 (카드 제목·일지 제목).

    일지 목록·상세는 모든 근무자가 볼 수 있으므로 링크 검색도 같게 전체 일지에서 찾는다.
    (예전에는 내가 쓰거나 참여한 일지만 찾아 다른 근무자의 카드는 링크할 수 없었음)
    """
    del user_id  # 호출부 호환용
    q_like = f"%{q}%"
    rows = db.execute(
        select(
            LogCard.id.label("card_id"),
            LogCard.title.label("card_title"),
            Log.id.label("log_id"),
            Log.date.label("log_date"),
            Log.title.label("log_title"),
            Log.shift_type.label("log_shift_type"),
            User.name.label("log_author"),
        )
        .join(Log, Log.id == LogCard.log_id)
        .join(User, User.id == Log.author_id)
        .where(
            LogCard.is_deleted.is_(False),
            Log.is_deleted.is_(False),
            or_(
                LogCard.title.ilike(q_like),
                Log.title.ilike(q_like),
            ),
        )
        .order_by(Log.date.desc(), LogCard.position)
        .limit(limit)
    ).all()

    return [
        CardLinkResult(
            card_id=r.card_id,
            card_title=r.card_title,
            log_id=r.log_id,
            log_date=str(r.log_date),
            log_title=r.log_title,
            log_author=r.log_author,
            log_shift_type=r.log_shift_type,  # 빠져 있어 결과가 있으면 응답 검사에서 오류 났음
        )
        for r in rows
    ]


def complete_chain(db: Session, card_id: int, user_id: int) -> int:
    """체인 내 모든 카드를 완료(done) 처리. 반환값: 변경된 카드 수."""
    links = load_ordered_links(db)
    if not links:
        return 0

    adjacency, _, _ = build_adjacency(links)
    node_ids = {link.source_card_id for link in links} | {link.target_card_id for link in links}
    component = get_component_for_card(card_id, adjacency, node_ids)
    if not component:
        return 0

    newly_done = list(db.scalars(select(LogCard.id).where(
        LogCard.id.in_(component), LogCard.is_deleted.is_(False), LogCard.status != "done")).all())
    now = datetime.now(timezone.utc)
    count = (
        db.query(LogCard)
        .filter(LogCard.id.in_(component), LogCard.is_deleted.is_(False))
        .update(
            {"status": "done", "status_changed_at": now, "status_changed_by": user_id},
            synchronize_session=False,
        )
    )

    # 체인 내 카드들의 일지 작성자에게 알림 발송 (본인 제외)
    editor = db.get(User, user_id)
    editor_name = editor.name if editor else "사용자"

    affected_cards = (
        db.query(LogCard)
        .filter(LogCard.id.in_(component), LogCard.is_deleted.is_(False))
        .all()
    )
    notified_authors: set[int] = set()
    for card in affected_cards:
        # 과제 테이블에 완료 기록 (남은 미완료 카드가 없으면 과제 종료)
        work_thread_sync.on_card_status(db, card, "done", user_id)
        log = db.get(Log, card.log_id)
        if log and log.author_id != user_id and log.author_id not in notified_authors:
            notified_authors.add(log.author_id)
            create_notification(
                db,
                user_id=log.author_id,
                type="card",
                body=f"{editor_name} 님이 연결된 카드 체인을 전체 완료 처리했습니다.",
                ref_type="card",
                ref_id=card.id,
            )
    # 이번에 완료된 문의 분류 카드마다 문의사항 한 건
    inquiry_auto_service.on_cards_done(db, newly_done, user_id)

    db.commit()
    return count


def link_card_to_chain(db: Session, source_card_id: int, target_card_id: int, user_id: int) -> None:
    """소스 카드에 타겟 카드를 체인에 연결합니다."""
    if source_card_id == target_card_id:
        raise ValueError("Same card cannot be linked to itself")

    existing = db.execute(
        select(CardLink).where(
            (CardLink.source_card_id == source_card_id) & (CardLink.target_card_id == target_card_id)
        )
    ).first()
    if existing:
        raise ValueError("Cards are already linked")

    db.add(CardLink(source_card_id=source_card_id, target_card_id=target_card_id, created_by=user_id))
    db.commit()


def unlink_card_from_chain(db: Session, card_id: int) -> None:
    """해당 카드가 관여하는 모든 CardLink 레코드를 삭제하여 체인에서 분리."""
    db.execute(
        CardLink.__table__.delete().where(
            or_(
                CardLink.source_card_id == card_id,
                CardLink.target_card_id == card_id,
            )
        )
    )
    db.commit()


def get_card_chain(db: Session, card_id: int) -> list[CardChainNode]:
    """Return the full connected chain rooted by the earliest link source."""
    links = load_ordered_links(db)
    if not links:
        return []

    adjacency, forward_map, _ = build_adjacency(links)
    node_ids = {link.source_card_id for link in links} | {link.target_card_id for link in links}
    component = get_component_for_card(card_id, adjacency, node_ids)
    if len(component) < 2:
        return []

    root_id = pick_root_card_id(component, links)
    if root_id is None:
        return []

    card_map = load_chain_card_map(db, component)
    if root_id not in card_map:
        return []

    root = build_chain_tree(root_id, card_map, forward_map)
    return [root] if root else []
