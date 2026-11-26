"""카드 상태 분류 CRUD 서비스."""
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.log import CardStatus, LogCard
from app.schemas.log import CardStatusCreate, CardStatusOut, CardStatusUpdate

_FALLBACK_STATUS = "in_progress"


def _to_out(s: CardStatus) -> CardStatusOut:
    return CardStatusOut.model_validate(s)


def list_statuses(db: Session) -> list[CardStatusOut]:
    rows = db.scalars(
        select(CardStatus)
        .where(CardStatus.is_deleted.is_(False))
        .order_by(CardStatus.sort_order, CardStatus.id)
    ).all()
    return [_to_out(r) for r in rows]


def create_status(db: Session, user_id: int, data: CardStatusCreate) -> CardStatusOut | None:
    if db.scalar(select(CardStatus).where(CardStatus.key == data.key)):
        return None  # key 중복
    row = CardStatus(
        key=data.key, label=data.label,
        color=data.color, sort_order=data.sort_order,
        created_by=user_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _to_out(row)


def update_status(db: Session, status_id: int, data: CardStatusUpdate) -> CardStatusOut | None:
    row = db.get(CardStatus, status_id)
    if not row or row.is_deleted:
        return None
    if data.label is not None:
        row.label = data.label
    if data.color is not None:
        row.color = data.color
    if data.sort_order is not None:
        row.sort_order = data.sort_order
    if data.is_active is not None:
        row.is_active = data.is_active
    db.commit()
    db.refresh(row)
    return _to_out(row)


def delete_status(db: Session, status_id: int, user_id: int) -> str | None:
    """None = 성공, 문자열 = 오류 메시지."""
    # Guard checks without lock (error paths do not hold a row lock)
    pre = db.get(CardStatus, status_id)
    if not pre or pre.is_deleted:
        return "상태를 찾을 수 없습니다"
    if pre.key == _FALLBACK_STATUS:
        return "기본 상태(진행중)는 삭제할 수 없습니다"
    if not db.scalar(
        select(CardStatus).where(
            CardStatus.key == _FALLBACK_STATUS,
            CardStatus.is_deleted.is_(False),
        )
    ):
        return "기본 상태(진행중)가 존재하지 않아 삭제할 수 없습니다"
    # Re-fetch with pessimistic lock before mutating
    row = db.scalar(
        select(CardStatus)
        .where(CardStatus.id == status_id, CardStatus.is_deleted.is_(False))
        .with_for_update()
    )
    if not row:
        return "상태를 찾을 수 없습니다"
    db.execute(
        update(LogCard)
        .where(LogCard.status == row.key, LogCard.is_deleted.is_(False))
        .values(status=_FALLBACK_STATUS)
    )
    row.is_deleted = True
    row.deleted_by = user_id
    row.deleted_at = datetime.now(timezone.utc)
    row.is_active = False
    db.commit()
    return None
