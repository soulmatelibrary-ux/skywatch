from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import generate_session_token, hash_password, verify_password
from app.models.user import Session as SessionModel, User


def authenticate(db: Session, login_id: str, password: str) -> User | None:
    user = db.query(User).filter(User.login_id == login_id, User.is_active == True).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def create_session(db: Session, user_id: int) -> str:
    token = generate_session_token()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.SESSION_EXPIRE_HOURS)
    session = SessionModel(id=token, user_id=user_id, expires_at=expires_at)
    db.add(session)
    db.commit()
    return token


def get_session_user(db: Session, token: str) -> User | None:
    now = datetime.now(timezone.utc)
    session = (
        db.query(SessionModel)
        .filter(SessionModel.id == token, SessionModel.expires_at > now)
        .first()
    )
    if not session:
        return None
    session.last_seen_at = now
    db.commit()
    return session.user


def delete_session(db: Session, token: str) -> None:
    db.query(SessionModel).filter(SessionModel.id == token).delete()
    db.commit()


def change_password(db: Session, user: User, new_password: str) -> None:
    password_hash, salt = hash_password(new_password)
    user.password_hash = password_hash
    user.salt = salt
    db.commit()
