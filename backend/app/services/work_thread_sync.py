"""과제 테이블과 기존 카드 상태·이월 기능의 동기화. 커밋은 호출자가 한다.

세션이 autoflush=False이므로 DB 조회 전에 반드시 flush한다.
신규 테이블이 없으면(마이그레이션 실패 등) 모든 동기화를 건너뛰어 기존 일지 저장을 막지 않는다.
"""
import logging
from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

from app.models.log import Log, LogCard
from app.models.work_thread import WorkThread, WorkThreadCard
from app.services.roster_service import kst_today
from app.services.work_thread_card_status import DONE_STATUSES, set_cards_status, sync_thread  # noqa: F401 (DONE_STATUSES 는 다른 서비스가 sync 에서 가져다 쓴다)

_ready = False


def enabled(db: Session) -> bool:
    global _ready
    if not _ready:
        _ready = inspect(db.get_bind()).has_table(WorkThreadCard.__tablename__)
        if not _ready:
            logging.warning("[과제 동기화] skywatch_work_thread_cards 테이블이 없어 동기화를 건너뜁니다")
    return _ready


def thread_of(db: Session, card_id: int) -> WorkThread | None:
    return db.scalar(
        select(WorkThread).join(WorkThreadCard, WorkThreadCard.thread_id == WorkThread.id)
        .where(WorkThreadCard.card_id == card_id)
    )


def link_card(db: Session, thread: WorkThread, card_id: int, origin: str, user_id: int | None) -> None:
    if db.get(WorkThreadCard, card_id) is None:
        db.add(WorkThreadCard(card_id=card_id, thread_id=thread.id, origin=origin, linked_by=user_id))
        db.flush()


def create_thread_from_card(db: Session, card: LogCard, origin: str, user_id: int | None,
                            kind: str = "thread") -> WorkThread:
    log = db.get(Log, card.log_id)
    thread = WorkThread(
        kind=kind, title=(card.title or "(제목 없음)")[:255], category_id=card.category_id,
        status="open", owner_id=card.created_by, started_on=log.date if log else kst_today(),
        created_by=user_id,
    )
    db.add(thread)
    db.flush()
    link_card(db, thread, card.id, origin, user_id)
    return thread


def reopen(thread: WorkThread, status: str = "open") -> None:
    """이어지는 일만 다시 연다. 종료된 장기 과제는 카드 기록으로 다시 열지 않는다."""
    if thread.kind == "project" and thread.status == "done":
        return
    thread.status = status
    thread.closed_on = None


def on_carry_over(db: Session, source: LogCard, new_card: LogCard, user_id: int) -> None:
    """기존 이월 기능: 원본 카드의 과제에 새 카드를 이어 붙인다."""
    if not enabled(db):
        return
    db.flush()
    thread = thread_of(db, source.id) or create_thread_from_card(db, source, "carry_over", user_id)
    link_card(db, thread, new_card.id, "carry_over", user_id)
    reopen(thread)
    sync_thread(db, thread, "open", user_id)  # 묶음 카드를 모두 진행중으로 (이월 원본의 '보류'도 진행중으로 맞춰진다)


def on_card_status(db: Session, card: LogCard, status: str, user_id: int) -> None:
    """카드 상태 변경을 이어지는 일에 반영한다. 장기 과제는 카드 상태로 바꾸지 않는다.

    묶음 안 카드 하나가 완료되면 묶음 전체 종료, 보류/진행중이면 일 상태와 나머지 카드가 따라간다.
    """
    if not enabled(db):
        return
    db.flush()
    thread = thread_of(db, card.id)
    if thread is not None and thread.kind == "project":
        return
    if status == "done":
        if thread is not None:
            sync_thread(db, thread, "done", user_id)
        return
    if status == "cancelled":
        return
    if thread is None:
        thread = create_thread_from_card(db, card, "status", user_id)
    sync_thread(db, thread, "hold" if status == "hold" else "open", user_id, except_ids=(card.id,))


def close_thread_cards(db: Session, thread_id: int, user_id: int, auto_inquiry: bool = True) -> None:
    """과제를 종료하면 기존 미완료 카드 탭에서도 사라지도록 남은 카드를 완료 처리한다 (문의 카드는 문의사항 등록)."""
    set_cards_status(db, thread_id, "done", user_id, auto_inquiry=auto_inquiry)


def preserved_link_targets(db: Session, card_id: int) -> set[int]:
    """같은 과제로 이어진 카드 간 연결(이월 등)은 본문 링크 동기화에서 지우지 않는다."""
    if not enabled(db):
        return set()
    thread_id = db.scalar(select(WorkThreadCard.thread_id).where(WorkThreadCard.card_id == card_id))
    if thread_id is None:
        return set()
    return set(db.scalars(
        select(WorkThreadCard.card_id).where(
            WorkThreadCard.thread_id == thread_id,
            WorkThreadCard.origin.in_(("carry_over", "migration")),
            WorkThreadCard.card_id != card_id,
        )
    ).all())
