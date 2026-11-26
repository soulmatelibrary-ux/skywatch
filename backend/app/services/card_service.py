"""카드 조회, 상태 변경, 삭제 서비스."""
import asyncio
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.log import CardCategory, CardLink, Log, LogCard
from app.models.user import User
from app.schemas.log import LogCardOut
from app.services import inquiry_auto_service, work_thread_sync


class CardNotFoundError(Exception):
    """카드를 찾을 수 없음."""
    pass


def get_card_by_id(db: Session, card_id: int) -> LogCard:
    """
    카드를 ID로 조회합니다 (삭제되지 않은 카드만).

    Args:
        db: SQLAlchemy 세션
        card_id: 조회할 카드 ID

    Returns:
        LogCard 객체

    Raises:
        CardNotFoundError: 카드를 찾을 수 없음
    """
    card = db.query(LogCard).filter(
        LogCard.id == card_id,
        LogCard.is_deleted.is_(False)
    ).first()

    if not card:
        raise CardNotFoundError(f"카드 {card_id}를 찾을 수 없습니다")

    return card


def soft_delete_card(db: Session, card_id: int, deleted_by: int) -> LogCard:
    """
    카드를 소프트 삭제합니다 (커밋하지 않음).

    Args:
        db: SQLAlchemy 세션
        card_id: 삭제할 카드 ID
        deleted_by: 삭제 수행자 ID

    Returns:
        삭제된 LogCard 객체

    Raises:
        CardNotFoundError: 카드를 찾을 수 없음

    Note:
        호출자가 db.commit()을 호출해야 합니다.
    """
    card = get_card_by_id(db, card_id)

    card.is_deleted = True
    card.deleted_by = deleted_by
    card.deleted_at = datetime.now(timezone.utc)

    return card


def _card_to_out(card: LogCard, db: Session) -> LogCardOut:
    cat = db.get(CardCategory, card.category_id) if card.category_id else None
    completed_by_name = None
    if card.completed_by:
        u = db.get(User, card.completed_by)
        completed_by_name = u.name if u else None
    last_edited_by_name = None
    if card.last_edited_by:
        u = db.get(User, card.last_edited_by)
        last_edited_by_name = u.name if u else None
    return LogCardOut(
        id=card.id, log_id=card.log_id,
        category_id=card.category_id,
        category_name=cat.name if cat else None,
        category_color=cat.color if cat else None,
        position=card.position,
        title=card.title, content=card.content,
        status=card.status,
        completed_by=card.completed_by, completed_by_name=completed_by_name,
        completed_at=card.completed_at,
        last_edited_by=card.last_edited_by, last_edited_by_name=last_edited_by_name,
        created_by=card.created_by,
        created_at=card.created_at, updated_at=card.updated_at,
    )


def _update_linked_cards(db: Session, root_card_id: int, status: str, user_id: int) -> list[int]:
    """
    주어진 카드와 연결된 모든 카드를 상태 변경합니다 (DFS).

    Args:
        db: SQLAlchemy 세션
        root_card_id: 루트 카드 ID
        status: 변경할 상태
        user_id: 변경하는 사용자 ID

    Returns:
        이번에 완료로 바뀐 카드 ID 목록 (문의사항 자동 등록용)
    """
    # 모든 링크 조회
    links = db.scalars(select(CardLink)).all()
    if not links:
        return []

    # 링크 맵 구성: {source → [targets], target → [sources]}
    forward_map: dict[int, list[int]] = {}  # source → targets
    backward_map: dict[int, list[int]] = {}  # target → sources

    for link in links:
        if link.source_card_id not in forward_map:
            forward_map[link.source_card_id] = []
        forward_map[link.source_card_id].append(link.target_card_id)

        if link.target_card_id not in backward_map:
            backward_map[link.target_card_id] = []
        backward_map[link.target_card_id].append(link.source_card_id)

    # DFS로 연결된 모든 카드 찾기
    visited = set()
    stack = [root_card_id]
    while stack:
        cid = stack.pop()
        if cid in visited:
            continue
        visited.add(cid)
        # 자식 추가
        if cid in forward_map:
            stack.extend(forward_map[cid])
        # 부모 추가
        if cid in backward_map:
            stack.extend(backward_map[cid])

    visited.discard(root_card_id)  # 루트는 이미 변경됨

    # 각 연결된 카드 상태 변경
    now = datetime.now(timezone.utc)
    newly_done: list[int] = []
    for linked_card_id in visited:
        card = db.get(LogCard, linked_card_id)
        if card and not card.is_deleted:
            if status == "done" and card.status != "done":
                newly_done.append(card.id)
            card.status = status
            card.status_changed_by = user_id
            card.status_changed_at = now
            card.last_edited_by = user_id
            if status == "done":
                card.completed_by = user_id
                card.completed_at = now
            # 연결 카드가 속한 과제에도 상태 반영
            work_thread_sync.on_card_status(db, card, status, user_id)
    return newly_done


def set_card_status(db: Session, card_id: int, user_id: int, status: str) -> LogCardOut | None:
    # 비관적 락: 동시 상태 변경 방지
    card = db.scalars(
        select(LogCard).where(LogCard.id == card_id).with_for_update()
    ).first()
    if not card or card.is_deleted:
        return None
    now = datetime.now(timezone.utc)
    newly_done = [card.id] if status == "done" and card.status != "done" else []
    card.status = status
    card.status_changed_by = user_id
    card.status_changed_at = now
    card.last_edited_by = user_id
    if status == "done":
        card.completed_by = user_id
        card.completed_at = now
    else:
        card.completed_by = None
        card.completed_at = None

    # 연결된 카드들도 같은 상태로 변경 (완료 상태일 때만)
    if status == "done":
        newly_done += _update_linked_cards(db, card_id, status, user_id)

    # 과제 테이블에 상태 변경 기록 (미완료 카드 → 과제 등록, 마지막 카드 완료 → 과제 종료)
    work_thread_sync.on_card_status(db, card, status, user_id)
    # 문의 분류 카드가 완료되면 문의사항에도 한 건 (실패해도 상태 변경은 저장)
    inquiry_auto_service.on_cards_done(db, newly_done, user_id)

    db.commit()
    db.refresh(card)
    if status == "done":
        _push_card_done_notification(db, card, user_id)
    return _card_to_out(card, db)


def _push_card_done_notification(db: Session, card: LogCard, done_by: int) -> None:
    """카드 완료 시 일지 작성자에게 알림."""
    from app.services.notification_service import create_notification
    from app.websocket.manager import manager

    log = db.get(Log, card.log_id)
    if not log or log.author_id == done_by:
        return
    user = db.get(User, done_by)
    user_name = user.name if user else "알 수 없음"
    body = f"[카드 완료] {user_name}님이 카드를 완료 처리했습니다: {card.title or ''}"
    notif = create_notification(db, log.author_id, "card", body,
                                ref_type="card", ref_id=card.id)
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(
                manager.send_to_user(log.author_id,
                                     {"type": "notification", "id": notif.id, "body": body})
            )
    except RuntimeError:
        pass
