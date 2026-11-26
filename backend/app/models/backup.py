"""DB 백업 실행 이력을 저장하는 모델."""
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.db.database import Base


class BackupLog(Base):
    __tablename__ = "skywatch_backup_logs"

    id               = Column(Integer, primary_key=True)
    action           = Column(String(20), nullable=False)          # backup | restore
    status           = Column(String(10), nullable=False)          # success | failure
    filename         = Column(String(255), nullable=True)
    file_size_bytes  = Column(Integer, nullable=True)
    error_message    = Column(Text, nullable=True)
    performed_by     = Column(Integer, ForeignKey("skywatch_users.id"), nullable=True)
    created_at       = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    is_deleted       = Column(Boolean, nullable=False, default=False)
    deleted_at       = Column(DateTime(timezone=True), nullable=True)
    deleted_by       = Column(Integer, ForeignKey("skywatch_users.id"), nullable=True)

    performer = relationship("User", foreign_keys=[performed_by])
    deleter = relationship("User", foreign_keys=[deleted_by])
