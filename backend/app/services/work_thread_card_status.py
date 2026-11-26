"""이어지는 일(thread) 묶음의 상태와 카드 상태를 함께 움직인다. 커밋은 호출자가 한다.

일 open -> 카드 in_progress(진행중), hold -> hold, done -> done. 장기 과제(project)는 대상이 아니다.
카드 상태 키는 카드 상태 마스터(skywatch_card_statuses)의 '진행중' 키(in_progress)를 쓴다.
"""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.log import LogCard
from app.models.work_thread import WorkThread, WorkThreadCard
from app.services import inquiry_auto_service
from app.services.roster_service import kst_today

DONE_STATUSES = ("done", "cancelled")
IN_PROGRESS = "in_progress"
_CARD_STATUS = {"open": IN_PROGRESS, "hold": "hold", "done": "done"}


def card_status_of(thread_status: str) -> str:
    return _CARD_STATUS.get(thread_status, IN_PROGRESS)


def set_cards_status(db: Session, thread_id: int, card_status: str, user_id: int,
                     except_ids: tuple[int, ...] = (), auto_inquiry: bool = True) -> None:
    """묶음의 삭제되지 않은 카드를 상태에 맞춘다. 취소된 카드는 그대로 둔다.
    완료 정보(completed_*)는 카드 상태 변경(card_service)과 같게: 완료면 기록, 아니면 비운다.
    auto_inquiry=False 는 과제 후보 일괄 적용(옛 카드 정리)처럼 근무자가 카드를 완료한 게 아닐 때."""
    db.flush()
    cards = db.scalars(
        select(LogCard).join(WorkThreadCard, WorkThreadCard.card_id == LogCard.id)
        .where(WorkThreadCard.thread_id == thread_id, LogCard.is_deleted.is_(False),
               LogCard.status != card_status, LogCard.status != "cancelled",
               LogCard.id.notin_(except_ids))
    ).all()
    now = datetime.now(timezone.utc)
    for c in cards:
        c.status = card_status
        c.status_changed_by = user_id
        c.status_changed_at = now
        c.completed_by = user_id if card_status == "done" else None
        c.completed_at = now if card_status == "done" else None
    if card_status == "done" and auto_inquiry:  # 일을 종료하면 묶음의 문의 분류 카드마다 문의사항 한 건
        inquiry_auto_service.on_cards_done(db, [c.id for c in cards], user_id)


def sync_thread(db: Session, thread: WorkThread, status: str, user_id: int,
                except_ids: tuple[int, ...] = ()) -> None:
    """이어지는 일 상태를 바꾸고 묶음의 모든 카드를 따라가게 한다."""
    if thread.kind != "thread":
        return
    if status == "done" and thread.status != "done":
        thread.closed_on = kst_today()
    elif status != "done":
        thread.closed_on = None
    thread.status = status
    set_cards_status(db, thread.id, card_status_of(status), user_id, except_ids)
