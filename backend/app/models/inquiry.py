# 문의사항 관리대장 ORM 모델
from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey,
    Integer, String, Text, func,
)
from sqlalchemy.orm import relationship

try:
    from pgvector.sqlalchemy import Vector
    HAS_PGVECTOR = True
except ImportError:
    Vector = None
    HAS_PGVECTOR = False

from app.db.database import Base


class Inquiry(Base):
    __tablename__ = "skywatch_inquiries"

    id              = Column(Integer, primary_key=True)
    inquiry_no      = Column(String(20), nullable=False, unique=True)
    occurred_date   = Column(Date, nullable=False)
    occurred_time   = Column(String(10))
    controller_sector = Column(String(100))
    sw_version      = Column(String(20))
    received_by     = Column(Integer, ForeignKey("skywatch_users.id"))
    received_by_raw = Column(String(50))
    category        = Column(String(100))
    keyword         = Column(String(255))
    content         = Column(Text)
    status          = Column(String(20), nullable=False, default="in_progress")
    completed_date  = Column(Date)
    pr_no           = Column(String(20))
    note            = Column(Text)
    card_id         = Column(Integer, ForeignKey("skywatch_log_cards.id"))

    created_by      = Column(Integer, ForeignKey("skywatch_users.id"))
    created_at      = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    last_edited_by  = Column(Integer, ForeignKey("skywatch_users.id"))
    is_deleted      = Column(Boolean, nullable=False, default=False)
    deleted_by      = Column(Integer, ForeignKey("skywatch_users.id"))
    deleted_at      = Column(DateTime(timezone=True))

    receiver = relationship("User", foreign_keys=[received_by])


class InquiryVector(Base):
    __tablename__ = "skywatch_inquiry_vectors"

    id          = Column(Integer, primary_key=True)
    inquiry_id  = Column(Integer, ForeignKey("skywatch_inquiries.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False, default=0)
    chunk_text  = Column(Text, nullable=True)
    embedding   = Column(Vector(1024) if HAS_PGVECTOR and Vector else Text, nullable=True)
    created_at  = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
