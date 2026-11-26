"""카드 수동 묶기: 이미 완료된 카드(기존 업무일지 카드 포함)를 골라 한 과제로 연결하거나 묶음에서 뺀다.

묶인 카드는 과제 상세에 근무별 타임라인으로 모이고, 카드 탐색에서 어느 카드를 열어도 같은 묶음이 보인다.
카드 하나는 과제 하나에만 속하므로, 이미 다른 묶음에 있던 카드는 이쪽으로 옮겨진다.
"""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.log import Log, LogCard
from app.models.work_thread import WorkThread, WorkThreadCard
from app.schemas.shift_log import ThreadCardsLink, ThreadDetailOut
from app.services import inquiry_auto_service, work_thread_service
from app.services.work_thread_card_status import DONE_STATUSES, card_status_of, set_cards_status


class ThreadLinkError(Exception):
    """잘못된 묶기 요청. 메시지는 화면에 그대로 보여 준다."""


def _cards_with_logs(db: Session, ids: list[int]) -> list[tuple[LogCard, Log]]:
    rows = db.execute(
        select(LogCard, Log).join(Log, Log.id == LogCard.log_id)
        .where(LogCard.id.in_(ids), LogCard.is_deleted.is_(False), Log.is_deleted.is_(False))
    ).all()
    return sorted(((c, lg) for c, lg in rows), key=lambda r: (r[1].date, r[0].id))


def _target_thread(db: Session, user_id: int, data: ThreadCardsLink, rows: list[tuple[LogCard, Log]]) -> WorkThread:
    if data.thread_id is not None:
        thread = db.get(WorkThread, data.thread_id)
        if thread is None or thread.is_deleted:
            raise ThreadLinkError("묶을 과제를 찾을 수 없습니다.")
        if thread.kind == "project":  # 장기 과제의 기록은 빼는 길이 없으므로 수동으로 넣지 않는다
            raise ThreadLinkError("장기 과제에는 카드를 직접 묶을 수 없습니다. 이어지는 일 묶음을 고르세요.")
        return thread
    title = (data.title or "").strip()
    if not title:
        raise ThreadLinkError("묶음 이름을 입력해 주세요.")
    if len(rows) < 2:
        raise ThreadLinkError("새 묶음은 카드를 두 장 이상 골라야 만들 수 있습니다.")
    # 이미 끝난 일을 묶는 것이므로 '종료' 상태로 만든다 (이어받은 일 목록을 어지럽히지 않고, 필요하면 다시 이어 쓸 수 있다)
    thread = WorkThread(kind="thread", title=title, category_id=rows[-1][0].category_id, status="done",
                        owner_id=user_id, started_on=rows[0][1].date, closed_on=rows[-1][1].date, created_by=user_id)
    db.add(thread)
    db.flush()
    return thread


def _refresh_period(db: Session, thread_id: int) -> None:
    """카드가 빠진 묶음의 시작일·종료일을 남은 카드 기준으로 다시 맞춘다 (카드가 없으면 그대로 둔다 — 목록에서 숨겨진다)."""
    thread = db.get(WorkThread, thread_id)
    if thread is None or thread.kind != "thread":
        return
    dates = db.scalars(
        select(Log.date).join(LogCard, LogCard.log_id == Log.id).join(WorkThreadCard, WorkThreadCard.card_id == LogCard.id)
        .where(WorkThreadCard.thread_id == thread_id, LogCard.is_deleted.is_(False), Log.is_deleted.is_(False))
    ).all()
    if dates:
        thread.started_on = min(dates)
        if thread.status == "done":
            thread.closed_on = max(dates)


def link_cards(db: Session, user_id: int, data: ThreadCardsLink) -> ThreadDetailOut:
    ids = list(dict.fromkeys(data.card_ids))
    rows = _cards_with_logs(db, ids)
    if len(rows) != len(ids):
        raise ThreadLinkError("삭제되었거나 찾을 수 없는 카드가 있습니다. 목록을 새로 고친 뒤 다시 골라 주세요.")
    unfinished = [card.title for card, _ in rows if card.status not in DONE_STATUSES]
    if unfinished:  # 진행 중인 카드를 종료된 묶음에 넣으면 미완료 목록·과제 상태가 어긋난다
        raise ThreadLinkError(f"완료된 카드만 묶을 수 있습니다. 진행 중인 카드가 있습니다: {unfinished[0]}")
    thread = _target_thread(db, user_id, data, rows)
    existing = {link.card_id: link for link in db.scalars(select(WorkThreadCard).where(WorkThreadCard.card_id.in_(ids)))}
    old_threads = {t.id: t for t in db.scalars(select(WorkThread).where(
        WorkThread.id.in_({link.thread_id for link in existing.values()})))} if existing else {}
    now = datetime.now(timezone.utc)
    for card, _ in rows:
        link = existing.get(card.id)
        if link is None:
            db.add(WorkThreadCard(card_id=card.id, thread_id=thread.id, origin="manual", linked_by=user_id))
        elif link.thread_id != thread.id:
            if old_threads[link.thread_id].kind == "project":
                raise ThreadLinkError(f"장기 과제에 기록된 카드는 옮길 수 없습니다: {card.title}")
            link.thread_id, link.origin, link.linked_by, link.linked_at = thread.id, "manual", user_id, now
    if thread.status != "done":  # 진행중·보류 일에 붙인 카드는 일 상태를 따른다
        set_cards_status(db, thread.id, card_status_of(thread.status), user_id)
    first, last = rows[0][1].date, rows[-1][1].date
    thread.started_on = min(thread.started_on, first)
    if thread.status == "done" and thread.closed_on and last > thread.closed_on:
        thread.closed_on = last
    db.flush()
    for old_id in {link.thread_id for link in existing.values()} - {thread.id}:
        _refresh_period(db, old_id)
    db.commit()
    return work_thread_service.get_thread(db, thread.id)


def detach_card(db: Session, thread: WorkThread, card_id: int, user_id: int) -> None:
    """카드를 묶음에서 빼고 완료로 돌린다 (커밋은 호출자). 장기 과제·다른 묶음 카드는 ThreadLinkError."""
    if thread.kind == "project":
        raise ThreadLinkError("장기 과제의 기록은 묶음에서 뺄 수 없습니다.")
    link = db.get(WorkThreadCard, card_id)
    if link is None or link.thread_id != thread.id:
        raise ThreadLinkError("이 묶음에 속한 카드가 아닙니다.")
    db.delete(link)
    card = db.get(LogCard, card_id)
    if card is not None and not card.is_deleted and card.status not in DONE_STATUSES:
        card.status = "done"  # 묶음에서 빼면 완료로 돌아간다 (진행 상태는 묶음이 갖고 있었다)
        card.status_changed_by, card.status_changed_at = user_id, datetime.now(timezone.utc)
        card.completed_by, card.completed_at = user_id, card.status_changed_at
        inquiry_auto_service.on_cards_done(db, [card.id], user_id)  # 문의 분류 카드면 문의사항 한 건
    db.flush()
    _refresh_period(db, thread.id)


def unlink_card(db: Session, thread_id: int, card_id: int, user_id: int) -> ThreadDetailOut:
    thread = db.get(WorkThread, thread_id)
    if thread is None or thread.is_deleted:
        raise ThreadLinkError("과제를 찾을 수 없습니다.")
    detach_card(db, thread, card_id, user_id)
    db.commit()
    return work_thread_service.get_thread(db, thread_id)
