from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func

from app.db.database import Base


class Notification(Base):
    __tablename__ = "skywatch_notifications"

    id         = Column(Integer, primary_key=True)
    user_id    = Column(Integer, ForeignKey("skywatch_users.id", ondelete="CASCADE"), nullable=False)
    type       = Column(String(30), nullable=False)
    ref_type   = Column(String(20))
    ref_id     = Column(Integer)
    body       = Column(Text)
    read_at    = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
