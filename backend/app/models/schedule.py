from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey,
    Integer, Numeric, String, Text, UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.db.database import Base


class Schedule(Base):
    __tablename__ = "skywatch_schedules"
    __table_args__ = (UniqueConstraint("team", "date"),)

    id         = Column(Integer, primary_key=True)
    team       = Column(String(10), nullable=False)
    date       = Column(Date, nullable=False)
    shift_type = Column(String(10), nullable=False)
    capacity   = Column(Integer, nullable=False, default=1)
    created_by = Column(Integer, ForeignKey("skywatch_users.id"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class ShiftOverride(Base):
    __tablename__ = "skywatch_shift_overrides"

    id               = Column(Integer, primary_key=True)
    date             = Column(Date, nullable=False)
    original_user_id = Column(Integer, ForeignKey("skywatch_users.id"), nullable=False)
    actual_user_id   = Column(Integer, ForeignKey("skywatch_users.id"), nullable=False)
    type             = Column(String(20), nullable=False)
    swap_group_id    = Column(UUID(as_uuid=True))
    approved_by      = Column(Integer, ForeignKey("skywatch_users.id"))
    note             = Column(Text)
    created_at       = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class LeaveRequest(Base):
    __tablename__ = "skywatch_leave_requests"

    id          = Column(Integer, primary_key=True)
    user_id     = Column(Integer, ForeignKey("skywatch_users.id"), nullable=False)
    date_from   = Column(Date, nullable=False)
    date_to     = Column(Date, nullable=False)
    reason      = Column(Text)
    status      = Column(String(20), nullable=False, default="pending")
    approved_by = Column(Integer, ForeignKey("skywatch_users.id"))
    created_at  = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class ShiftStaffMemo(Base):
    __tablename__ = "skywatch_shift_staff_memos"
    __table_args__ = (UniqueConstraint("date", "user_id", "memo_type"),)

    id         = Column(Integer, primary_key=True)
    date       = Column(Date, nullable=False)
    user_id    = Column(Integer, ForeignKey("skywatch_users.id", ondelete="CASCADE"), nullable=False)
    memo_type  = Column(String(20), nullable=False)
    memo_text  = Column(Text)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(),
                        onupdate=func.now())


class ShiftCarryOver(Base):
    __tablename__ = "skywatch_shift_carry_over"

    id         = Column(Integer, primary_key=True)
    user_id    = Column(Integer, ForeignKey("skywatch_users.id", ondelete="CASCADE"), nullable=False)
    entry_type = Column(String(10), nullable=False)
    entry_date = Column(Date, nullable=False)
    shift_type = Column(String(20))
    hours      = Column(Numeric(4, 1), nullable=False, default=0)
    note       = Column(Text)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class ShiftNotice(Base):
    __tablename__ = "skywatch_shift_notices"

    id         = Column(Integer, primary_key=True)
    text       = Column(Text, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date   = Column(Date, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(Integer, ForeignKey("skywatch_users.id"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class Attachment(Base):
    __tablename__ = "skywatch_attachments"

    id            = Column(Integer, primary_key=True)
    owner_type    = Column(String(20), nullable=False)
    owner_id      = Column(Integer, nullable=False)
    original_name = Column(String(255), nullable=False)
    file_path     = Column(String(500), nullable=False)
    file_name     = Column(String(255), nullable=False)
    file_size     = Column(Integer, nullable=False)
    mime_type     = Column(String(100))
    content_text  = Column(Text, nullable=True)       # 첨부파일 추출 텍스트 (검색용)
    uploaded_by   = Column(Integer, ForeignKey("skywatch_users.id"), nullable=False)
    created_at    = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    is_deleted    = Column(Boolean, nullable=False, default=False)


class ShiftData(Base):
    __tablename__ = "skywatch_shift_data"

    date      = Column(Date, primary_key=True)
    shift_code = Column(String(10))
    repeat_type = Column(String(20))
    memo      = Column(JSONB, default=lambda: {})
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
