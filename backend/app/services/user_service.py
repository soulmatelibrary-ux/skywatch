"""사용자 CRUD 서비스 (관리자 전용)."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.schemas.user import UserAdminOut, UserCreate, UserUpdate


def _to_out(u: User) -> UserAdminOut:
    return UserAdminOut.model_validate(u)


def list_all_users(db: Session) -> list[UserAdminOut]:
    users = db.scalars(
        select(User).order_by(User.sort_order, User.id)
    ).all()
    return [_to_out(u) for u in users]


def create_user(db: Session, data: UserCreate, created_by: int) -> UserAdminOut:
    password_hash, salt = hash_password(data.password)
    user = User(
        name=data.name, login_id=data.login_id, role=data.role,
        team=data.team, grade=data.grade, password_hash=password_hash,
        salt=salt, sort_order=data.sort_order, joined_at=data.joined_at,
        no_excel=data.no_excel, note=data.note, created_by=created_by,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _to_out(user)


def update_user(db: Session, user_id: int, data: UserUpdate) -> UserAdminOut | None:
    user = db.get(User, user_id)
    if not user:
        return None
    for field, val in data.model_dump(exclude_unset=True).items():
        setattr(user, field, val)
    db.commit()
    db.refresh(user)
    return _to_out(user)


def reset_user_password(db: Session, user_id: int, new_password: str) -> bool:
    user = db.get(User, user_id)
    if not user:
        return False
    password_hash, salt = hash_password(new_password)
    user.password_hash = password_hash
    user.salt = salt
    db.commit()
    return True


def deactivate_user(db: Session, user_id: int) -> bool:
    user = db.get(User, user_id)
    if not user:
        return False
    user.is_active = False
    db.commit()
    return True
