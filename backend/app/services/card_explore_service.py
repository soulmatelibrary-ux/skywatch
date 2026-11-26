"""카드 탐색 — 기존·신규 카드를 카드 단위로 필터·집계·페이지 처리."""
from datetime import date

from sqlalchemy import and_, case, exists, func, literal_column, or_, select
from sqlalchemy.orm import Session

from app.models.log import CardCategory, Log, LogCard, LogParticipant
from app.models.work_thread import CardMemo, WorkThread, WorkThreadCard
from app.schemas.shift_log import ExploreFacet, ExploreOut
from app.services.shift_card_dto import build_cards

KIND_LABELS = {"single": "당일 종료", "thread": "이어지는 일", "project": "장기 과제", "memo": "전달·메모"}
_LATE_SQL = literal_column(
    "(skywatch_log_cards.created_at > ((skywatch_logs.date + CASE WHEN skywatch_logs.shift_type = '주간' "
    "THEN interval '24 hours' ELSE interval '36 hours' END) AT TIME ZONE 'Asia/Seoul'))"
)


def _kind_expr():
    return case(
        (CardMemo.card_id.isnot(None), "memo"),
        (WorkThread.kind == "project", "project"),
        (WorkThread.id.isnot(None), "thread"),
        else_="single",
    )


def _base():
    return (
        select(LogCard)
        .join(Log, Log.id == LogCard.log_id)
        .outerjoin(CardMemo, CardMemo.card_id == LogCard.id)
        .outerjoin(WorkThreadCard, WorkThreadCard.card_id == LogCard.id)
        .outerjoin(WorkThread, WorkThread.id == WorkThreadCard.thread_id)
        .where(LogCard.is_deleted.is_(False), Log.is_deleted.is_(False), Log.shift_type != "공지")
    )


def _conditions(q, category_ids, kinds, worker_id, date_from, date_to, late_only, skip=None):
    conds = []
    if q:
        for word in q.split():
            # %, _ 는 와일드카드가 아니라 글자 그대로 찾는다
            like = "%" + word.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
            conds.append(or_(LogCard.title.ilike(like, escape="\\"), LogCard.content.ilike(like, escape="\\")))
    if category_ids and skip != "category":
        conds.append(LogCard.category_id.in_(category_ids))
    if kinds and skip != "kind":
        conds.append(_kind_expr().in_(kinds))
    if worker_id:
        has_parts = exists().where(LogParticipant.log_id == Log.id)
        conds.append(or_(
            exists().where(LogParticipant.log_id == Log.id, LogParticipant.user_id == worker_id),
            and_(~has_parts, Log.author_id == worker_id),
        ))
    if date_from:
        conds.append(Log.date >= date_from)
    if date_to:
        conds.append(Log.date <= date_to)
    if late_only:
        conds.extend([Log.source_seq.is_(None), _LATE_SQL])
    return conds


def explore(db: Session, q: str | None, category_ids: list[int], kinds: list[str], worker_id: int | None,
            date_from: date | None, date_to: date | None, late_only: bool, page: int, per_page: int) -> ExploreOut:
    args = (q, category_ids, kinds, worker_id, date_from, date_to, late_only)
    stmt = _base().where(*_conditions(*args))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    order = case((Log.shift_type == "야간", 2), (Log.shift_type == "주야", 1), else_=0)
    cards = db.scalars(
        stmt.order_by(Log.date.desc(), order.desc(), LogCard.position.desc(), LogCard.id.desc())
        .offset((page - 1) * per_page).limit(per_page)
    ).all()

    cat_rows = db.execute(
        _base().with_only_columns(LogCard.category_id, func.count())
        .where(*_conditions(*args, skip="category")).group_by(LogCard.category_id)
    ).all()
    cats = {c.id: c for c in db.scalars(select(CardCategory).order_by(CardCategory.sort_order)).all()}
    counts = {cid: n for cid, n in cat_rows}
    category_facets = [
        ExploreFacet(key=str(c.id), label=c.name, color=c.color, count=counts.get(c.id, 0))
        for c in cats.values() if c.is_active or counts.get(c.id)
    ]
    kind_expr = _kind_expr()
    kind_rows = dict(db.execute(
        _base().with_only_columns(kind_expr, func.count())
        .where(*_conditions(*args, skip="kind")).group_by(kind_expr)
    ).all())
    kind_facets = [ExploreFacet(key=k, label=v, count=kind_rows.get(k, 0)) for k, v in KIND_LABELS.items()]
    return ExploreOut(items=build_cards(db, list(cards)), total=total,
                      category_facets=category_facets, kind_facets=kind_facets)
