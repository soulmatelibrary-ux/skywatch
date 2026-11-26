"""알림 CRUD 및 멘션 처리 서비스."""
import math
import re
from datetime import datetime, timezone
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.log import Comment
from app.models.notification import Notification
from app.models.user import User
from app.schemas.common import Pagination


def create_notification(
    db: Session,
    user_id: int,
    type: str,
    body: str,
    ref_type: str | None = None,
    ref_id: int | None = None,
) -> Notification:
    notif = Notification(
        user_id=user_id,
        type=type,
        ref_type=ref_type,
        ref_id=ref_id,
        body=body,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif


def list_notifications(
    db: Session,
    user_id: int,
    unread_only: bool = False,
    page: int = 1,
    per_page: int = 20,
    q: str = "",
    date_from: str | None = None,
    date_to: str | None = None,
) -> tuple[list[Notification], Pagination]:
    from datetime import timedelta
    base = (
        select(Notification)
        .outerjoin(Comment, (Notification.ref_type == "comment") & (Notification.ref_id == Comment.id))
        .where(
            Notification.user_id == user_id,
            # 삭제된 댓글 관련 알림 제외
            ~(
                (Notification.ref_type == "comment") &
                (Comment.is_deleted.is_(True))
            ),
        )
    )
    if unread_only:
        base = base.where(Notification.read_at.is_(None))
    if q:
        base = base.where(Notification.body.ilike(f"%{q}%"))
    if date_from:
        base = base.where(Notification.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        base = base.where(Notification.created_at < datetime.fromisoformat(date_to) + timedelta(days=1))

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    offset = (page - 1) * per_page
    rows = list(db.scalars(base.order_by(Notification.created_at.desc()).offset(offset).limit(per_page)).all())
    pagination = Pagination(
        page=page, per_page=per_page, total=total,
        total_pages=max(1, math.ceil(total / per_page)),
    )
    return rows, pagination


def count_unread(db: Session, user_id: int) -> int:
    return db.scalar(
        select(func.count()).select_from(Notification).where(
            Notification.user_id == user_id,
            Notification.read_at.is_(None),
        )
    ) or 0


def mark_read(db: Session, notif_id: int, user_id: int) -> bool:
    notif = db.get(Notification, notif_id)
    if not notif or notif.user_id != user_id:
        return False
    if notif.read_at is None:
        notif.read_at = datetime.now(timezone.utc)
        db.commit()
    return True


def mark_all_read(db: Session, user_id: int) -> int:
    notifs = db.scalars(
        select(Notification).where(
            Notification.user_id == user_id,
            Notification.read_at.is_(None),
        )
    ).all()
    now = datetime.now(timezone.utc)
    for n in notifs:
        n.read_at = now
    db.commit()
    return len(notifs)


def delete_notification(db: Session, notif_id: int, user_id: int) -> bool:
    notif = db.get(Notification, notif_id)
    if not notif or notif.user_id != user_id:
        return False
    db.delete(notif)
    db.commit()
    return True


def delete_read_notifications(db: Session, user_id: int) -> int:
    count = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.read_at.isnot(None),
    ).delete(synchronize_session=False)
    db.commit()
    return count


def create_mention_notifications(
    db: Session,
    content: str | None,
    author_id: int,
    author_name: str,
    ref_type: str,
    ref_id: int,
) -> set[int]:
    """@멘션 파싱 후 멘션된 사용자들에게 알림 생성. 반환: 알림받은 사용자 ID 세트."""
    if not content:
        return set()

    mentioned_names = set(re.findall(r'@([a-zA-Z0-9_-]+)', content))
    notified: set[int] = set()

    for name in mentioned_names:
        user = db.scalars(select(User).where(User.name == name)).first()
        if user and user.id != author_id:
            body = f"[멘션] {author_name}님이 회원님을 언급했습니다."
            create_notification(
                db, user.id, "mention", body,
                ref_type=ref_type, ref_id=ref_id
            )
            notified.add(user.id)

    return notified
