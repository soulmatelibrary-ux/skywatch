"""일지 작성 및 수정 서비스."""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.log import CardLink, Log, LogCard, LogParticipant
from app.models.notification import Notification
from app.models.user import User
from app.schemas.log import CardUpsert, LogCreate, LogDetailOut, LogUpdate, ParticipantIn
from app.services import inquiry_auto_service, log_detail_service, template_service, work_thread_sync
from app.services.notification_service import create_mention_notifications
from app.utils.html_links import extract_card_ids_in_order


class DuplicateLogError(ValueError):
    """동일 날짜/근무유형 일지 중복 에러."""


def _auto_title(data: LogCreate) -> str:
    return f"[{data.date}] {data.shift_type} 근무일지"


def _create_new_log_notifications(db: Session, log: Log, author_name: str, data: LogCreate) -> None:
    """새 일지 작성 시 모든 활성 사용자에게 알림 발송 (commit 미포함)."""
    users = db.scalars(
        select(User).where(User.is_active.is_(True), User.id != log.author_id)
    ).all()
    for u in users:
        db.add(Notification(
            user_id=u.id,
            type="new_log",
            ref_type="log",
            ref_id=log.id,
            body=f"[새 일지] {author_name}님이 {data.date} {data.shift_type} 일지를 작성했습니다.",
        ))


# 신규 근무일지(shift_log_service)에서도 같은 '새 일지' 알림을 쓰기 위한 공개 이름
notify_new_log = _create_new_log_notifications


def sync_card_links(db: Session, card_id: int, content: str | None, user_id: int) -> None:
    """카드 content의 sw-link를 파싱해 CardLink 레코드 동기화."""
    target_ids = extract_card_ids_in_order(content)
    # 기존 링크 삭제 — 단, 같은 과제로 이어진 이월 연결은 본문에 없어도 유지
    preserved = work_thread_sync.preserved_link_targets(db, card_id)
    delete_stmt = CardLink.__table__.delete().where(CardLink.source_card_id == card_id)
    if preserved:
        delete_stmt = delete_stmt.where(CardLink.target_card_id.notin_(preserved))
    db.execute(delete_stmt)
    kept = set(db.scalars(select(CardLink.target_card_id).where(CardLink.source_card_id == card_id)).all())
    # 신규 링크 삽입 (자기 자신·유지된 링크 제외)
    for tid in dict.fromkeys(target_ids):
        if tid != card_id and tid not in kept:
            db.add(CardLink(source_card_id=card_id, target_card_id=tid, created_by=user_id))


def _sync_cards(db: Session, log_id: int, user_id: int, cards: list[CardUpsert], author_name: str) -> None:
    """카드 목록 동기화 (신규/수정/삭제) + CardLink 동기화 + 멘션 처리."""
    now = datetime.now(timezone.utc)
    existing = {c.id: c for c in db.scalars(
        select(LogCard).where(LogCard.log_id == log_id, LogCard.is_deleted.is_(False))
    ).all()}
    # 같은 묶음의 카드를 한 화면에서 함께 저장할 때, 묶음 동기화로 이미 바뀐 상태를 화면의 예전 값이 되돌리지 않게
    # 저장 전 상태를 기억해 두고 화면에서 실제로 바꾼 상태만 반영한다.
    stored_status = {cid: c.status for cid, c in existing.items()}
    inquiry_card_ids: list[int] = []  # 완료로 바뀌었거나 완료 상태에서 분류가 바뀐 카드 → 문의사항 자동 등록 후보

    for item in cards:
        if item.to_delete and item.id:
            card = existing.get(item.id)
            if card:
                card.is_deleted = True
                card.deleted_by = user_id
                card.deleted_at = now
                db.execute(CardLink.__table__.delete().where(CardLink.source_card_id == item.id))
            continue
        if item.id and item.id in existing:
            card = existing[item.id]
            old_status, old_category = card.status, card.category_id
            card.title = item.title
            card.content = item.content
            card.category_id = item.category_id
            card.position = item.position
            if item.status is not None and item.status != stored_status[item.id]:
                card.status = item.status
            card.last_edited_by = user_id
            db.flush()
            # 상태가 바뀌면 과제 테이블에도 기록 (기존 미완료 카드 탭과 과제 보드 일치)
            if card.status != old_status:
                work_thread_sync.on_card_status(db, card, card.status, user_id)
            if card.status == "done" and (old_status != "done" or card.category_id != old_category):
                inquiry_card_ids.append(card.id)
            sync_card_links(db, card.id, item.content, user_id)
            # 카드 수정 시 멘션 처리
            create_mention_notifications(
                db, item.content or item.title, user_id, author_name, "log", log_id
            )
        else:
            new_card = LogCard(
                log_id=log_id,
                category_id=item.category_id,
                title=item.title,
                content=item.content,
                position=item.position,
                status=item.status or "open",
                created_by=user_id,
            )
            db.add(new_card)
            db.flush()
            # 화면에서 미완료 상태를 지정해 만든 카드만 과제로 등록
            # (상태 없이 만드는 CSV 임포트 등은 등록하지 않는다)
            if item.status is not None and item.status not in work_thread_sync.DONE_STATUSES:
                work_thread_sync.on_card_status(db, new_card, new_card.status, user_id)
            if item.status == "done":  # 상태 없이 만드는 가져오기는 대상 아님
                inquiry_card_ids.append(new_card.id)
            sync_card_links(db, new_card.id, item.content, user_id)
            # 카드 생성 시 멘션 처리
            create_mention_notifications(
                db, item.content or item.title, user_id, author_name, "log", log_id
            )
    # 문의 분류 카드가 완료되면 문의사항에도 한 건 (실패해도 일지 저장은 계속)
    inquiry_auto_service.on_cards_done(db, inquiry_card_ids, user_id)


def _sync_participants(db: Session, log_id: int, participants: list[ParticipantIn]) -> None:
    if participants:
        user_ids = [p.user_id for p in participants]
        existing_ids = set(db.scalars(
            select(User.id).where(User.id.in_(user_ids))
        ).all())
        missing = [uid for uid in user_ids if uid not in existing_ids]
        if missing:
            raise ValueError(f"존재하지 않는 사용자 ID: {missing}")
    db.execute(LogParticipant.__table__.delete().where(LogParticipant.log_id == log_id))
    for p in participants:
        db.add(LogParticipant(
            log_id=log_id, user_id=p.user_id,
            role=p.role, sub_for=p.sub_for, note=p.note,
        ))


def create_log(db: Session, user_id: int, data: LogCreate) -> LogDetailOut:
    existing = db.scalar(
        select(Log).where(
            Log.date == data.date,
            Log.shift_type == data.shift_type,
            Log.is_deleted.is_(False),
        )
    )
    if existing and data.shift_type != '공지':
        raise DuplicateLogError("이미 해당 날짜/근무유형의 일지가 존재합니다")

    # 한 번만 author 조회
    author = db.get(User, user_id)
    author_name = author.name if author else "사용자"

    log = Log(
        author_id=user_id, date=data.date, shift_type=data.shift_type,
        title=data.title or _auto_title(data), tags=data.tags or [],
        created_by=user_id,
    )
    db.add(log)
    db.flush()

    # 카드 준비: 입력된 카드가 있으면 사용, 없으면 자동 생성
    cards = data.cards
    if not cards:
        matched = template_service.get_matching_for_log(db, data.date, data.shift_type)
        cards = [
            CardUpsert(
                title=t.get("template_title") or t.get("name") or "",
                content=t.get("template_body") or "",
                position=idx,
            )
            for idx, t in enumerate(matched)
        ]
        current_count = len(cards)
        for i in range(max(0, 2 - current_count)):
            cards.append(CardUpsert(title="", content="", position=current_count + i))

    _sync_cards(db, log.id, user_id, cards, author_name)
    _sync_participants(db, log.id, data.participants)

    # 일지 제목에서 멘션 처리
    create_mention_notifications(db, log.title, user_id, author_name, "log", log.id)

    # 새 일지 알림 발송
    _create_new_log_notifications(db, log, author_name, data)

    db.commit()

    result = log_detail_service.get_log(db, log.id, user_id)
    if result is None:
        raise ValueError("일지 생성 후 조회에 실패했습니다")
    return result


def update_log(db: Session, log_id: int, user_id: int, data: LogUpdate) -> LogDetailOut | None:
    log = db.get(Log, log_id)
    if not log or log.is_deleted:
        return None

    # 한 번만 author 조회
    author = db.get(User, user_id)
    author_name = author.name if author else "사용자"

    log.last_edited_by = user_id
    if data.date is not None:
        log.date = data.date
    if data.shift_type is not None:
        log.shift_type = data.shift_type
    if data.title is not None:
        log.title = data.title
    if data.tags is not None:
        log.tags = data.tags
    _sync_cards(db, log_id, user_id, data.cards, author_name)
    if data.participants is not None:
        _sync_participants(db, log_id, data.participants)

    # 일지 제목에서 멘션 처리
    create_mention_notifications(db, log.title, user_id, author_name, "log", log.id)

    db.commit()

    return log_detail_service.get_log(db, log_id, user_id)
