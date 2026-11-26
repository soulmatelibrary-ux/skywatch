from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey,
    Integer, String, Text, func,
)
from sqlalchemy.orm import relationship

from app.db.database import Base


class User(Base):
    __tablename__ = "skywatch_users"

    id            = Column(Integer, primary_key=True)
    name          = Column(String(50), nullable=False)
    login_id      = Column(String(20), nullable=False, unique=True)
    role          = Column(String(20), nullable=False)          # shift_worker|day_worker|admin
    team          = Column(String(10), nullable=False)          # A|B|C|D|day
    grade         = Column(String(20))
    password_hash = Column(String(255), nullable=False, default="")
    salt          = Column(String(100), nullable=False, default="")
    is_active     = Column(Boolean, nullable=False, default=True)
    sort_order    = Column(Integer, nullable=False, default=0)
    joined_at     = Column(Date)
    resigned_at   = Column(Date)
    note          = Column(Text)
    no_excel      = Column(Boolean, nullable=False, default=False)
    created_by    = Column(Integer, ForeignKey("skywatch_users.id"))
    created_at    = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), nullable=False, server_default=func.now(),
                           onupdate=func.now())


class Session(Base):
    __tablename__ = "skywatch_sessions"

    id           = Column(String(128), primary_key=True)
    user_id      = Column(Integer, ForeignKey("skywatch_users.id", ondelete="CASCADE"), nullable=False)
    expires_at   = Column(DateTime(timezone=True), nullable=False)
    created_at   = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    last_seen_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])
