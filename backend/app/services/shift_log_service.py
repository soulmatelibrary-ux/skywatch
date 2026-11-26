"""신규 일지 쓰기 — 근무별 일지 준비, 카드 추가(항상 완료 상태), 근무자 저장, 화면 조회."""
from datetime import date, timedelta
from types import SimpleNamespace

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.log import Log, LogCard, LogParticipant
from app.models.user import User
from app.models.work_thread import WorkThread
from app.schemas.shift_log import (
    HandoverOut, RoutineOut, ShiftCardCreate, ShiftViewOut, WorkerOut,
)
from app.services import inquiry_auto_service, log_write_service, template_service
from app.services import work_thread_card_status as card_status
from app.services import work_thread_sync as sync
from app.services.roster_service import kst_today, roster_team_label, roster_workers
from app.services.shift_card_dto import build_cards, html_to_text, text_to_html


class ShiftLogError(ValueError):
    pass


def find_log(db: Session, d: date, shift: str) -> Log | None:
    return db.scalar(select(Log).where(Log.date == d, Log.shift_type == shift, Log.is_deleted.is_(False)))


def conflict_of(db: Session, d: date, shift: str) -> str | None:
    """주야 일지와 주간·야간 일지는 같은 날 함께 둘 수 없다."""
    others = ("주간", "야간") if shift == "주야" else ("주야",)
    found = db.scalar(select(Log.shift_type).where(
        Log.date == d, Log.shift_type.in_(others), Log.is_deleted.is_(False)).limit(1))
    if found is None:
        return None
    return f"같은 날 {found} 일지가 이미 있어 {shift} 일지를 쓸 수 없습니다."


def ensure_log(db: Session, d: date, shift: str, user: User) -> Log:
    log = find_log(db, d, shift)
    if log is not None:
        return log
    if d > kst_today():
        raise ShiftLogError("오늘 이후 근무의 일지는 쓸 수 없습니다.")
    conflict = conflict_of(db, d, shift)
    if conflict:
        raise ShiftLogError(conflict)
    log = Log(author_id=user.id, date=d, shift_type=shift, tags=[], created_by=user.id)
    db.add(log)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        log = find_log(db, d, shift)
        if log is None:
            raise
        return log
    workers = roster_workers(db, d, shift) or [{"user_id": user.id}]
    for i, w in enumerate(workers):
        db.add(LogParticipant(log_id=log.id, user_id=w["user_id"], role="primary" if i == 0 else "support"))
    # 기존 일지 작성과 같은 '새 일지' 알림
    log_write_service.notify_new_log(db, log, user.name, SimpleNamespace(date=d, shift_type=shift))
    db.flush()
    return log


def workers_of(db: Session, log: Log | None, d: date, shift: str) -> list[WorkerOut]:
    if log is not None:
        rows = db.execute(
            select(LogParticipant.user_id, LogParticipant.role, User.name, User.team)
            .join(User, User.id == LogParticipant.user_id)
            .where(LogParticipant.log_id == log.id).order_by(LogParticipant.id)
        ).all()
        if rows:
            return [WorkerOut(user_id=u, name=n, team=t, role=r) for u, r, n, t in rows]
    return [WorkerOut(**w) for w in roster_workers(db, d, shift)]


def log_cards(db: Session, log: Log | None) -> list[LogCard]:
    if log is None:
        return []
    return list(db.scalars(
        select(LogCard).where(LogCard.log_id == log.id, LogCard.is_deleted.is_(False))
        .order_by(LogCard.position, LogCard.id)
    ).all())


def previous_shift(d: date, shift: str) -> tuple[date, str]:
    if shift == "야간":
        return d, "주간"
    return d - timedelta(days=1), "야간"


def _handover(db: Session, d: date, shift: str) -> HandoverOut | None:
    pd, ps = previous_shift(d, shift)
    log = find_log(db, pd, ps) or find_log(db, pd, "주야")
    if log is None:
        return None
    return HandoverOut(date=pd, shift_type=log.shift_type, team=roster_team_label(db, pd, log.shift_type),
                       cards=build_cards(db, log_cards(db, log)))


def _routines(db: Session, d: date, shift: str, cards: list[LogCard]) -> list[RoutineOut]:
    titles = {c.title.strip() for c in cards}
    result = []
    for t in template_service.get_matching_for_log(db, d, shift):
        title = (t.get("template_title") or t.get("name") or "").strip()
        if title:
            body = html_to_text(t.get("template_body") or "")
            result.append(RoutineOut(title=title, body=body, done=title in titles))
    return result


def get_view(db: Session, d: date, shift: str) -> ShiftViewOut:
    log = find_log(db, d, shift)
    cards = log_cards(db, log)
    return ShiftViewOut(
        date=d, shift_type=shift, log_id=log.id if log else None,
        team=roster_team_label(db, d, shift), workers=workers_of(db, log, d, shift),
        is_past=d < kst_today(), conflict=None if log else conflict_of(db, d, shift),
        cards=build_cards(db, cards), handover=_handover(db, d, shift),
        routines=_routines(db, d, shift, cards),
    )


def append_card(db: Session, log: Log, user: User, title: str, content: str,
                category_id: int | None) -> LogCard:
    pos = db.scalar(select(func.coalesce(func.max(LogCard.position), -1))
                    .where(LogCard.log_id == log.id, LogCard.is_deleted.is_(False)))
    card = LogCard(log_id=log.id, category_id=category_id, position=pos + 1, title=title.strip()[:255],
                   content=content, status="done", created_by=user.id)
    db.add(card)
    db.flush()
    if not (log.title or "").strip():
        log.title = card.title
    log.last_edited_by = user.id
    return card


def _card_html(data: ShiftCardCreate) -> str:
    """편집기 HTML(표·이미지 포함)은 기존 업무일지 편집기와 같은 형식이므로 그대로 저장한다.
    내용이 빈 편집기(<p></p>)면 평문 body를 문단으로 바꿔 쓴다."""
    html = (data.content or "").strip()
    if html and (html_to_text(html) or "<img" in html or "<table" in html):
        return html
    return text_to_html(data.body)


def add_card(db: Session, user: User, data: ShiftCardCreate) -> tuple[LogCard, list[str]]:
    """카드를 저장하고 (카드, 자동 등록한 문의사항 번호 목록)을 돌려준다."""
    log = ensure_log(db, data.date, data.shift_type, user)
    thread = None
    if data.thread_id:
        thread = db.get(WorkThread, data.thread_id)
        if thread is None or thread.is_deleted:
            raise ShiftLogError("연결할 과제를 찾을 수 없습니다.")
    card = append_card(db, log, user, data.title, _card_html(data), data.category_id)
    log_write_service.sync_card_links(db, card.id, card.content, user.id)
    if thread is not None:
        sync.link_card(db, thread, card.id, "new", user.id)
        if thread.kind == "thread":  # 이어서 쓰면 일과 묶음의 모든 카드가 진행중이 된다
            card_status.sync_thread(db, thread, "open", user.id)
        elif thread.status != "open":
            sync.reopen(thread)
    elif data.new_thread:
        new_thread = sync.create_thread_from_card(db, card, "new", user.id)
        card_status.sync_thread(db, new_thread, "open", user.id)
    # 완료로 남은 문의 분류 카드만 문의사항에 등록 (이어지는 일은 진행중이라 대상 아님)
    inquiry_nos = inquiry_auto_service.on_cards_done(db, [card.id], user.id)
    db.commit()
    db.refresh(card)
    return card, inquiry_nos


def set_participants(db: Session, user: User, d: date, shift: str, user_ids: list[int]) -> list[WorkerOut]:
    log = ensure_log(db, d, shift, user)
    valid = set(db.scalars(select(User.id).where(User.id.in_(user_ids))).all())
    ordered = [u for u in dict.fromkeys(user_ids) if u in valid]
    if not ordered:
        raise ShiftLogError("근무자를 한 명 이상 지정해 주세요.")
    # 기존 화면에서 지정한 대체(sub)·추가 근무(overtime) 역할은 유지한다
    prev = {p.user_id: (p.role, p.sub_for, p.note) for p in db.scalars(
        select(LogParticipant).where(LogParticipant.log_id == log.id)).all()}
    roles = [prev.get(uid, ("support", None, None)) for uid in ordered]
    if not any(r[0] == "primary" for r in roles):
        roles[0] = ("primary", roles[0][1], roles[0][2])
    db.execute(LogParticipant.__table__.delete().where(LogParticipant.log_id == log.id))
    for uid, (role, sub_for, note) in zip(ordered, roles):
        db.add(LogParticipant(log_id=log.id, user_id=uid, role=role, sub_for=sub_for, note=note))
    log.last_edited_by = user.id
    db.commit()
    return workers_of(db, log, d, shift)
