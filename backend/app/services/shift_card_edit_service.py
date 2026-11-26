"""쓰기 화면 카드 수정·삭제 — 기존 수정·삭제 서비스 재사용 + 이어짐 전환(thread_mode)·충돌 검사. 한 번에 커밋한다."""
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.log import CardCategory, LogCard
from app.models.user import User
from app.models.work_thread import CardMemo, WorkThreadCard
from app.schemas.log import CardUpdate
from app.schemas.shift_log import ShiftCardOut, ShiftCardUpdate
from app.services import card_edit_service, card_service, inquiry_auto_service, log_write_service
from app.services import work_thread_card_status as card_status
from app.services import work_thread_link_service as link_service
from app.services import work_thread_sync as sync
from app.services.shift_card_dto import build_cards

logger = logging.getLogger(__name__)


class CardEditNotFound(Exception): ...   # 카드가 없거나 이미 삭제됨 (404)


class CardEditInvalid(ValueError):
    """잘못된 수정 요청 (400). 메시지는 화면에 그대로 보인다."""


class CardEditConflict(Exception):
    """다른 사람이 먼저 고침 (409). 메시지는 화면에 그대로 보인다."""


def _locked_card(db: Session, card_id: int) -> LogCard:
    card = db.scalars(select(LogCard).where(LogCard.id == card_id).with_for_update()).first()
    if card is None or card.is_deleted:
        raise CardEditNotFound()
    return card


def _content_changed(card: LogCard, data: ShiftCardUpdate) -> bool:
    """수정 시작 시점(base_*)과 지금 값을 비교. base 를 안 보낸 요청(구형)은 항상 바뀐 것으로 본다."""
    sent = data.model_fields_set & {"base_title", "base_content", "base_category_id"}
    if not sent:
        return True
    return (("base_title" in sent and (card.title or "") != (data.base_title or ""))
            or ("base_content" in sent and (card.content or "") != (data.base_content or ""))
            or ("base_category_id" in sent and card.category_id != data.base_category_id))


def _check_conflict(db: Session, card: LogCard, data: ShiftCardUpdate, user_id: int) -> None:
    """updated_at 이 달라졌어도 제목·본문·분류가 그대로면(상태 변경·묶음 동기화 등) 충돌이 아니다."""
    expected = data.expected_updated_at
    if expected is not None and expected.tzinfo is None:
        expected = expected.replace(tzinfo=timezone.utc)
    if expected is None or abs(card.updated_at - expected) < timedelta(milliseconds=1) or not _content_changed(card, data):
        return
    msg = "그 사이 이 카드가 바뀌었습니다. 바뀐 내용을 확인한 뒤 다시 저장해 주세요."
    who = db.get(User, card.last_edited_by) if card.last_edited_by and card.last_edited_by != user_id else None
    raise CardEditConflict(f"{msg} ({who.name} 님이 고친 내용이 있습니다.)" if who else msg)


def _check_category(db: Session, card: LogCard, data: ShiftCardUpdate) -> None:
    """분류를 바꿀 때만 존재·사용 여부를 확인한다 (이미 비활성인 분류의 카드는 그대로 저장 가능)."""
    cid = data.category_id
    if "category_id" in data.model_fields_set and cid is not None and cid != card.category_id:
        cat = db.get(CardCategory, cid)
        if cat is None or not cat.is_active:
            raise CardEditInvalid("선택한 분류를 사용할 수 없습니다. 다른 분류를 골라 주세요.")


def _live_count(db: Session, thread_id: int) -> int:
    q = select(func.count(LogCard.id)).join(WorkThreadCard, WorkThreadCard.card_id == LogCard.id)
    return db.scalar(q.where(WorkThreadCard.thread_id == thread_id, LogCard.is_deleted.is_(False))) or 0


def _change_thread_mode(db: Session, card: LogCard, mode: str, user_id: int) -> None:
    """thread: 일회성 카드로 새 이어지는 일을 만들고 진행중으로 / single: 이 카드만 일에서 빼 완료(하나뿐이면 일을 종료)."""
    if mode == "keep":
        return
    thread = sync.thread_of(db, card.id)
    if thread is not None and thread.kind == "project":
        raise CardEditInvalid("장기 과제 카드는 이어짐을 바꿀 수 없습니다.")
    if db.get(CardMemo, card.id) is not None:
        raise CardEditInvalid("전달·메모는 이어짐을 바꿀 수 없습니다.")
    if mode == "thread" and thread is None:
        new_thread = sync.create_thread_from_card(db, card, "new", user_id)
        card_status.sync_thread(db, new_thread, "open", user_id)
    elif mode == "single" and thread is not None:
        if _live_count(db, thread.id) <= 1:   # 하나뿐인 일: 일을 종료하고 카드를 완료로
            card_status.sync_thread(db, thread, "done", user_id)
        else:
            link_service.detach_card(db, thread, card.id, user_id)


def update_card(db: Session, user: User, card_id: int, data: ShiftCardUpdate) -> ShiftCardOut:
    card = _locked_card(db, card_id)
    _check_conflict(db, card, data, user.id)
    title = data.title.strip() if data.title is not None else None
    if title == "":
        raise CardEditInvalid("카드 제목을 입력해 주세요.")
    _check_category(db, card, data)
    fields = {k: v for k, v in {"title": title, "content": data.content, "category_id": data.category_id}.items()
              if k in data.model_fields_set}
    old_category = card.category_id
    try:
        card_edit_service.apply_card_edit(db, card, user.id, CardUpdate(**fields),
                                          sync=log_write_service.sync_card_links)
        _change_thread_mode(db, card, data.thread_mode, user.id)
        if card.category_id != old_category:  # 완료 카드를 문의 분류로 바꾸면 문의사항 한 건
            inquiry_auto_service.on_cards_done(db, [card.id], user.id)
    except (CardEditInvalid, link_service.ThreadLinkError):
        db.rollback()
        raise
    db.commit()
    db.refresh(card)
    try:   # 이미 저장된 뒤라 알림 실패가 저장 실패로 보이면 안 된다
        card_edit_service.notify_card_edit(db, card, user.id)
    except Exception:
        db.rollback()
        logger.exception("카드 수정 알림 실패 card_id=%s", card_id)
    return build_cards(db, [card])[0]


def delete_card(db: Session, user: User, card_id: int) -> None:
    """소프트 삭제(삭제자·시각 기록) + 묶음 정리: 이어지는 일에서 빼고 남은 카드가 없으면 일 종료, 장기 과제는 연결 유지."""
    _locked_card(db, card_id)
    card = card_service.soft_delete_card(db, card_id, user.id)
    # 삭제된 카드가 일지 제목의 출처였으면 남은 첫 카드 제목으로 갱신
    _refresh_log_title(db, card.log_id)
    thread = sync.thread_of(db, card_id)
    if thread is not None and thread.kind == "thread":
        link_service.detach_card(db, thread, card_id, user.id)
        if _live_count(db, thread.id) == 0:
            card_status.sync_thread(db, thread, "done", user.id)
    db.commit()


def _refresh_log_title(db: Session, log_id: int) -> None:
    """일지의 살아 있는 첫 카드 제목으로 일지 제목을 갱신한다. 카드가 없으면 빈 문자열."""
    from app.models.log import Log
    log = db.get(Log, log_id)
    if log is None:
        return
    first = db.scalar(
        select(LogCard.title)
        .where(LogCard.log_id == log_id, LogCard.is_deleted.is_(False))
        .order_by(LogCard.position)
        .limit(1)
    )
    log.title = first or ""
