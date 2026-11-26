"""일지 상세 조회 및 열람 확인 서비스."""
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models.log import (
    CardCategory, CardLink, CardStatus, Comment, Log, LogAcknowledgment, LogCard, LogParticipant, LogRead,
)
from app.models.schedule import Attachment
from app.models.work_thread import WorkThread, WorkThreadCard
from app.models.user import User
from app.services.card_chain_utils import load_ordered_links
from app.schemas.log import (
    AttachmentOut, LinkedCardInfo, LogCardOut, LogDetailOut, LogLinkedCard, ParticipantOut, ReadStatusOut, UserNameOut,
)


def _get_counts(db: Session, log_id: int, current_user_id: int) -> dict:
    card_row = db.execute(
        select(
            func.count(LogCard.id).label("card_count"),
            func.sum(case((LogCard.status == "open", 1), else_=0)).label("open_count"),
        ).where(LogCard.log_id == log_id, LogCard.is_deleted.is_(False))
    ).one()
    comment_count = db.scalar(
        select(func.count(Comment.id)).where(
            Comment.log_id == log_id, Comment.is_deleted.is_(False)
        )
    ) or 0
    is_read = db.get(LogRead, (log_id, current_user_id)) is not None
    has_acked = db.get(LogAcknowledgment, (log_id, current_user_id)) is not None
    return {
        "card_count": card_row.card_count or 0,
        "open_count": int(card_row.open_count or 0),
        "comment_count": comment_count,
        "is_read": is_read,
        "has_acked": has_acked,
    }


def _thread_card_counts(db: Session, card_ids: list[int]) -> dict[int, int]:
    """이어지는 일(thread) 묶음에 속한 카드의 묶음 카드 수. 묶음 밖·장기 과제 카드는 포함하지 않는다."""
    mine = select(WorkThreadCard.card_id.label("card_id"), WorkThreadCard.thread_id.label("thread_id"))         .where(WorkThreadCard.card_id.in_(card_ids)).subquery()
    rows = db.execute(
        select(mine.c.card_id, func.count(LogCard.id))
        .join(WorkThread, WorkThread.id == mine.c.thread_id)
        .join(WorkThreadCard, WorkThreadCard.thread_id == mine.c.thread_id)
        .join(LogCard, LogCard.id == WorkThreadCard.card_id)
        .where(WorkThread.kind == "thread", WorkThread.is_deleted.is_(False), LogCard.is_deleted.is_(False))
        .group_by(mine.c.card_id)
    ).all()
    return {cid: n for cid, n in rows}


def _build_cards(cards_raw: list, db: Session) -> list[LogCardOut]:
    """카드 목록 + 카테고리·사용자·첨부파일·상태색상 정보 배치 조회."""
    if not cards_raw:
        return []

    cat_ids = list({c.category_id for c in cards_raw if c.category_id})
    user_ids = list({uid for c in cards_raw
                     for uid in [c.completed_by, c.last_edited_by] if uid})
    card_ids = [c.id for c in cards_raw]
    status_keys = list({c.status for c in cards_raw if c.status})

    cats = {c.id: c for c in db.scalars(select(CardCategory).where(CardCategory.id.in_(cat_ids))).all()} if cat_ids else {}
    users = {u.id: u for u in db.scalars(select(User).where(User.id.in_(user_ids))).all()} if user_ids else {}
    statuses = {s.key: s for s in db.scalars(select(CardStatus).where((CardStatus.key.in_(status_keys)) & (CardStatus.is_deleted.is_(False)))).all()} if status_keys else {}
    att_rows = db.scalars(
        select(Attachment).where(
            Attachment.owner_type == "card",
            Attachment.owner_id.in_(card_ids),
            Attachment.is_deleted.is_(False),
        ).order_by(Attachment.id)
    ).all()
    att_map: dict[int, list[Attachment]] = {}
    for a in att_rows:
        att_map.setdefault(a.owner_id, []).append(a)

    thread_counts = _thread_card_counts(db, card_ids)
    result = []
    for c in cards_raw:
        cat = cats.get(c.category_id)
        status = statuses.get(c.status)
        result.append(LogCardOut(
            id=c.id, log_id=c.log_id,
            category_id=c.category_id,
            category_name=cat.name if cat else None,
            category_color=cat.color if cat else None,
            position=c.position, title=c.title, content=c.content,
            status=c.status,
            status_color=status.color if status else None,
            completed_by=c.completed_by,
            completed_by_name=users[c.completed_by].name if c.completed_by and c.completed_by in users else None,
            completed_at=c.completed_at,
            last_edited_by=c.last_edited_by,
            last_edited_by_name=users[c.last_edited_by].name if c.last_edited_by and c.last_edited_by in users else None,
            created_by=c.created_by, created_at=c.created_at, updated_at=c.updated_at,
            attachments=[AttachmentOut.from_orm_attachment(a) for a in att_map.get(c.id, [])],
            thread_card_count=thread_counts.get(c.id, 0),
        ))
    return result


def get_log(db: Session, log_id: int, current_user_id: int) -> LogDetailOut | None:
    log = db.get(Log, log_id)
    if not log or log.is_deleted:
        return None

    author = db.get(User, log.author_id)
    counts = _get_counts(db, log_id, current_user_id)

    cards_raw = db.scalars(
        select(LogCard)
        .where(LogCard.log_id == log_id, LogCard.is_deleted.is_(False))
        .order_by(LogCard.position)
    ).all()
    participants_raw = db.scalars(
        select(LogParticipant).where(LogParticipant.log_id == log_id)
    ).all()

    user_ids = list({p.user_id for p in participants_raw} | {p.sub_for for p in participants_raw if p.sub_for})
    user_map = {u.id: u.name for u in db.scalars(select(User).where(User.id.in_(user_ids))).all()} if user_ids else {}
    participants = [
        ParticipantOut(
            user_id=p.user_id, name=user_map.get(p.user_id),
            role=p.role, sub_for=p.sub_for,
            sub_for_name=user_map.get(p.sub_for) if p.sub_for else None,
            note=p.note,
        )
        for p in participants_raw
    ]

    return LogDetailOut(
        id=log.id, author_id=log.author_id,
        author_name=author.name if author else None,
        team=author.team if author else None,
        date=log.date, shift_type=log.shift_type, title=log.title,
        created_at=log.created_at, updated_at=log.updated_at,
        **counts,
        cards=_build_cards(list(cards_raw), db),
        participants=participants,
    )


def ack_log(db: Session, log_id: int, user_id: int) -> None:
    """열람 기록 (모달 열릴 때 자동)."""
    if db.get(LogRead, (log_id, user_id)):
        return
    db.add(LogRead(log_id=log_id, user_id=user_id))
    db.commit()


def acknowledge_log(db: Session, log_id: int, user_id: int) -> bool:
    """명시적 확인 버튼. 이미 확인한 경우 False."""
    if db.get(LogAcknowledgment, (log_id, user_id)):
        return False
    db.add(LogAcknowledgment(log_id=log_id, user_id=user_id))
    db.commit()
    return True


def get_read_status(db: Session, log_id: int, current_user_id: int) -> ReadStatusOut:
    reads = db.execute(
        select(LogRead.user_id, User.name)
        .join(User, User.id == LogRead.user_id)
        .where(LogRead.log_id == log_id)
    ).all()
    acks = db.execute(
        select(LogAcknowledgment.user_id, User.name)
        .join(User, User.id == LogAcknowledgment.user_id)
        .where(LogAcknowledgment.log_id == log_id)
    ).all()
    participant_ids = list(db.scalars(
        select(LogParticipant.user_id).where(LogParticipant.log_id == log_id)
    ).all())
    has_acked = db.get(LogAcknowledgment, (log_id, current_user_id)) is not None
    return ReadStatusOut(
        reads=[UserNameOut(user_id=r.user_id, name=r.name) for r in reads],
        acks=[UserNameOut(user_id=a.user_id, name=a.name) for a in acks],
        participant_ids=participant_ids,
        has_acked=has_acked,
    )


def get_linked_cards(db: Session, log_id: int) -> list[LogLinkedCard]:
    """
    현재 로그의 카드 중 다른 로그의 카드와 연결된 카드들을 조회합니다.

    Returns:
        LogLinkedCard 리스트 (현재 로그의 카드 + 연결된 다른 로그의 카드들)
    """
    # 현재 로그의 모든 카드 조회
    log_cards = db.scalars(
        select(LogCard).where(LogCard.log_id == log_id, LogCard.is_deleted.is_(False))
    ).all()

    if not log_cards:
        return []

    log_card_ids = {c.id for c in log_cards}

    # Keep link traversal stable by using link creation order.
    links = load_ordered_links(db)

    # 카드별로 연결된 링크 맵 만들기
    card_links: dict[int, list[int]] = {}
    for link in links:
        # source_card_id가 현재 로그의 카드인 경우
        if link.source_card_id in log_card_ids:
            card_links.setdefault(link.source_card_id, [])
            if link.target_card_id not in card_links[link.source_card_id]:
                card_links[link.source_card_id].append(link.target_card_id)
        # target_card_id가 현재 로그의 카드인 경우
        if link.target_card_id in log_card_ids:
            card_links.setdefault(link.target_card_id, [])
            if link.source_card_id not in card_links[link.target_card_id]:
                card_links[link.target_card_id].append(link.source_card_id)

    if not card_links:
        return []

    # 연결된 카드들을 조회 (다른 로그의 카드만)
    linked_card_ids = set()
    for cards in card_links.values():
        linked_card_ids.update(cards)

    linked_cards_data = db.scalars(
        select(LogCard).where(LogCard.id.in_(linked_card_ids), LogCard.is_deleted.is_(False))
    ).all()
    linked_cards_map = {c.id: c for c in linked_cards_data}

    # 연결된 카드들의 로그 조회
    linked_log_ids = {c.log_id for c in linked_cards_data if c.log_id != log_id}
    linked_logs = db.scalars(select(Log).where(Log.id.in_(linked_log_ids))).all()
    linked_logs_map = {l.id: l for l in linked_logs}

    # 결과 구성
    result: list[LogLinkedCard] = []
    for card in log_cards:
        if card.id not in card_links:
            continue

        linked = []
        for linked_card_id in card_links[card.id]:
            linked_card = linked_cards_map.get(linked_card_id)
            if not linked_card or linked_card.log_id == log_id:
                continue
            linked_log = linked_logs_map.get(linked_card.log_id)
            if linked_log:
                linked.append(LinkedCardInfo(
                    card_id=linked_card.id,
                    card_title=linked_card.title,
                    log_id=linked_log.id,
                    log_date=linked_log.date.isoformat(),
                    log_title=linked_log.title,
                ))

        if linked:
            result.append(LogLinkedCard(
                card_id=card.id,
                card_title=card.title,
                linked_cards=linked,
            ))

    return result
