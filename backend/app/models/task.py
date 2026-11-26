from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey,
    Integer, String, Text, func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.database import Base


class Task(Base):
    __tablename__ = "skywatch_tasks"

    id              = Column(Integer, primary_key=True)
    sender_id       = Column(Integer, ForeignKey("skywatch_users.id"), nullable=False)
    title           = Column(String(255), nullable=False)
    body            = Column(Text)
    importance      = Column(String(10), nullable=False, default="normal")
    due_date        = Column(String(16))                     # 'YYYY-MM-DD HH:mm' KST
    recipients_mode = Column(String(20), nullable=False, default="individual")
    recipients      = Column(JSONB, nullable=False, default=list)
    target_teams    = Column(JSONB, nullable=False, default=list)
    completed_by    = Column(JSONB, nullable=False, default=list)
    linked_card_id  = Column(Integer, ForeignKey("skywatch_log_cards.id"))
    created_at      = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), nullable=False, server_default=func.now(),
                             onupdate=func.now())
    is_deleted      = Column(Boolean, nullable=False, default=False)
    deleted_by      = Column(Integer, ForeignKey("skywatch_users.id"))
    deleted_at      = Column(DateTime(timezone=True))
    is_archived     = Column(Boolean, nullable=False, default=False)
    archived_at     = Column(DateTime(timezone=True))

    sender = relationship("User", foreign_keys=[sender_id])


class RecurringTaskTemplate(Base):
    __tablename__ = "skywatch_recurring_task_templates"

    id                 = Column(Integer, primary_key=True)
    name               = Column(String(255), nullable=False)
    frequency          = Column(String(20), nullable=False)
    run_at_time        = Column(String(5))
    days_of_week       = Column(JSONB)
    day_of_month       = Column(Integer)
    run_once_date      = Column(Date)
    template_content   = Column(JSONB)
    target_teams       = Column(JSONB, nullable=False, default=list)
    target_shift_types = Column(JSONB, nullable=False, default=list)
    next_run_at        = Column(DateTime(timezone=True))
    last_run_at        = Column(DateTime(timezone=True))
    is_active          = Column(Boolean, nullable=False, default=True)
    created_by         = Column(Integer, ForeignKey("skywatch_users.id"))
    created_at         = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
