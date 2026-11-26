"""과제(이어지는 일·장기 과제) 조회·생성·상태 변경·내년 복사."""
import re
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.log import CardCategory, Log, LogCard
from app.models.user import User
from app.models.work_thread import WorkThread, WorkThreadCard, WorkThreadPhase
from app.schemas.shift_log import (
    LastCardInfo, PhaseOut, ThreadCreate, ThreadDetailOut, ThreadOut, ThreadUpdate,
)
from app.services import work_thread_card_status as card_status
from app.services import work_thread_sync as sync
from app.services.roster_service import kst_today
from app.services.shift_card_dto import build_cards, html_to_text

_NEXT_RE = re.compile(r"^다음\s*[:：]\s*(.+)$")
_SHIFT_ORDER = {"주간": 0, "주야": 1, "야간": 2}


def next_step(text: str) -> str | None:
    for line in text.split("\n"):
        m = _NEXT_RE.match(line.strip())
        if m:
            return m.group(1)
    return None


def _thread_cards(db: Session, thread_ids: list[int]) -> dict[int, list[tuple[LogCard, Log]]]:
    rows = db.execute(
        select(WorkThreadCard.thread_id, LogCard, Log)
        .join(LogCard, LogCard.id == WorkThreadCard.card_id)
        .join(Log, Log.id == LogCard.log_id)
        .where(WorkThreadCard.thread_id.in_(thread_ids), LogCard.is_deleted.is_(False),
               Log.is_deleted.is_(False))
    ).all()
    result: dict[int, list[tuple[LogCard, Log]]] = {}
    for tid, card, log in rows:
        result.setdefault(tid, []).append((card, log))
    for items in result.values():
        items.sort(key=lambda x: (x[1].date, _SHIFT_ORDER.get(x[1].shift_type, 3), x[0].id), reverse=True)
    return result


def _to_out(t: WorkThread, cards: list[tuple[LogCard, Log]], cats: dict, users: dict) -> ThreadOut:
    cat = cats.get(t.category_id)
    last = None
    if cards:
        card, log = cards[0]
        text = html_to_text(card.content)
        last = LastCardInfo(date=log.date, shift_type=log.shift_type, title=card.title,
                            next_step=next_step(text), summary=text.split("\n")[0] if text else "")
    return ThreadOut(
        id=t.id, kind=t.kind, title=t.title, category_id=t.category_id,
        category_name=cat.name if cat else None, category_color=cat.color if cat else None,
        status=t.status, owner_id=t.owner_id, owner_name=users.get(t.owner_id),
        started_on=t.started_on, closed_on=t.closed_on, current_phase=t.current_phase,
        recur_month=t.recur_month,
        phases=[PhaseOut(seq=p.seq, name=p.name, start_month=p.start_month, end_month=p.end_month)
                for p in t.phases],
        card_count=len(cards), author_count=len({c.created_by for c, _ in cards}), last_card=last,
        recent_shifts=list(dict.fromkeys(f"{lg.date.isoformat()} {lg.shift_type}" for _, lg in cards))[:10],
    )


def _maps(db: Session) -> tuple[dict, dict]:
    cats = {c.id: c for c in db.scalars(select(CardCategory)).all()}
    users = {u.id: u.name for u in db.scalars(select(User)).all()}
    return cats, users


def list_threads(db: Session, kind: str | None, statuses: list[str], as_of: date | None,
                 closed_since: date | None) -> list[ThreadOut]:
    stmt = select(WorkThread).where(WorkThread.is_deleted.is_(False))
    if kind:
        stmt = stmt.where(WorkThread.kind == kind)
    if statuses:
        stmt = stmt.where(WorkThread.status.in_(statuses))
    if as_of:
        stmt = stmt.where(WorkThread.started_on <= as_of)
    if closed_since:
        stmt = stmt.where((WorkThread.closed_on.is_(None)) | (WorkThread.closed_on >= closed_since))
    threads = db.scalars(stmt.order_by(WorkThread.started_on.desc(), WorkThread.id.desc())).all()
    cards = _thread_cards(db, [t.id for t in threads])
    cats, users = _maps(db)
    # 카드가 모두 삭제된 이어지는 일(재임포트 등으로 남은 빈 과제)은 보여주지 않는다
    return [_to_out(t, cards.get(t.id, []), cats, users) for t in threads
            if t.kind == "project" or cards.get(t.id)]


def get_thread(db: Session, thread_id: int) -> ThreadDetailOut | None:
    t = db.get(WorkThread, thread_id)
    if t is None or t.is_deleted:
        return None
    pairs = _thread_cards(db, [t.id]).get(t.id, [])
    cats, users = _maps(db)
    out = _to_out(t, pairs, cats, users)
    return ThreadDetailOut(**out.model_dump(), cards=build_cards(db, [c for c, _ in pairs]))


def create_thread(db: Session, user_id: int, data: ThreadCreate) -> ThreadDetailOut:
    t = WorkThread(kind=data.kind, title=data.title, category_id=data.category_id, status="open",
                   owner_id=user_id, started_on=data.started_on or kst_today(),
                   recur_month=data.recur_month, created_by=user_id)
    t.phases = [WorkThreadPhase(seq=i, name=p.name, start_month=p.start_month, end_month=p.end_month)
                for i, p in enumerate(data.phases)]
    db.add(t)
    db.commit()
    return get_thread(db, t.id)


def update_thread(db: Session, thread_id: int, user_id: int, data: ThreadUpdate) -> ThreadDetailOut | None:
    t = db.get(WorkThread, thread_id)
    if t is None or t.is_deleted:
        return None
    if data.title is not None:
        t.title = data.title
    if data.current_phase is not None:
        t.current_phase = min(data.current_phase, len(t.phases))
    if data.status is not None and data.status != t.status:
        if t.kind == "thread":  # 일 상태와 묶음의 모든 카드가 같이 움직인다
            card_status.sync_thread(db, t, data.status, user_id)
        else:
            t.status = data.status
            t.closed_on = kst_today() if data.status == "done" else None
            if data.status == "done":
                sync.close_thread_cards(db, t.id, user_id)
                t.current_phase = len(t.phases)
    db.commit()
    return get_thread(db, t.id)


def _shift_month(month: str, years: int) -> str:
    y, m = month.split("-")
    return f"{int(y) + years:04d}-{m}"


def copy_next_year(db: Session, thread_id: int, user_id: int) -> ThreadDetailOut | None:
    src = db.get(WorkThread, thread_id)
    if src is None or src.is_deleted:
        return None
    title = re.sub(r"(20\d{2})", lambda m: str(int(m.group(1)) + 1), src.title, count=1)
    if title == src.title:
        title = f"{src.title} (다음 해)"
    try:
        start = src.started_on.replace(year=src.started_on.year + 1)
    except ValueError:  # 2월 29일
        start = src.started_on.replace(year=src.started_on.year + 1, day=28)
    t = WorkThread(kind=src.kind, title=title[:255], category_id=src.category_id, status="open",
                   owner_id=user_id, started_on=start, recur_month=src.recur_month,
                   source_thread_id=src.id, created_by=user_id)
    t.phases = [WorkThreadPhase(seq=p.seq, name=p.name, start_month=_shift_month(p.start_month, 1),
                                end_month=_shift_month(p.end_month, 1)) for p in src.phases]
    db.add(t)
    db.commit()
    return get_thread(db, t.id)
