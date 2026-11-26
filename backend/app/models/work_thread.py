"""과제(이어지는 일·장기 과제)와 전달·메모 모델.

기존 일지/카드 테이블은 그대로 두고, 카드와의 매칭만 별도 테이블로 관리한다.
"""
from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey, Integer, String, func,
)
from sqlalchemy.orm import relationship

from app.db.database import Base


class WorkThread(Base):
    """여러 근무에 걸친 일. kind: thread(며칠 이어지는 일) | project(단계가 있는 장기 과제)."""
    __tablename__ = "skywatch_work_threads"

    id               = Column(Integer, primary_key=True)
    kind             = Column(String(10), nullable=False, default="thread")
    title            = Column(String(255), nullable=False)
    category_id      = Column(Integer, ForeignKey("skywatch_card_categories.id"))
    status           = Column(String(10), nullable=False, default="open")  # open | hold | done
    owner_id         = Column(Integer, ForeignKey("skywatch_users.id"))
    started_on       = Column(Date, nullable=False)
    closed_on        = Column(Date)
    current_phase    = Column(Integer, nullable=False, default=0)
    recur_month      = Column(Integer)
    source_thread_id = Column(Integer, ForeignKey("skywatch_work_threads.id"))
    created_by       = Column(Integer, ForeignKey("skywatch_users.id"))
    created_at       = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), nullable=False, server_default=func.now(),
                              onupdate=func.now())
    is_deleted       = Column(Boolean, nullable=False, default=False)

    phases = relationship("WorkThreadPhase", order_by="WorkThreadPhase.seq",
                          cascade="all, delete-orphan")


class WorkThreadPhase(Base):
    """장기 과제 단계. 월은 'YYYY-MM' 문자열."""
    __tablename__ = "skywatch_work_thread_phases"

    id          = Column(Integer, primary_key=True)
    thread_id   = Column(Integer, ForeignKey("skywatch_work_threads.id", ondelete="CASCADE"), nullable=False)
    seq         = Column(Integer, nullable=False, default=0)
    name        = Column(String(50), nullable=False)
    start_month = Column(String(7), nullable=False)
    end_month   = Column(String(7), nullable=False)


class WorkThreadCard(Base):
    """카드와 과제 매칭. 카드 하나는 과제 하나에만 속한다."""
    __tablename__ = "skywatch_work_thread_cards"

    card_id   = Column(Integer, ForeignKey("skywatch_log_cards.id", ondelete="CASCADE"), primary_key=True)
    thread_id = Column(Integer, ForeignKey("skywatch_work_threads.id", ondelete="CASCADE"),
                       nullable=False, index=True)
    origin    = Column(String(20), nullable=False, default="new")  # new|carry_over|status|migration|manual
    linked_by = Column(Integer, ForeignKey("skywatch_users.id"))
    linked_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class CardMemo(Base):
    """전달·메모. 카드 테이블에 한 줄 카드로 저장하고 받는 사람·유지 정보만 둔다."""
    __tablename__ = "skywatch_card_memos"

    card_id        = Column(Integer, ForeignKey("skywatch_log_cards.id", ondelete="CASCADE"), primary_key=True)
    target_type    = Column(String(10), nullable=False, default="next")  # next | all | user
    target_user_id = Column(Integer, ForeignKey("skywatch_users.id"))
    keep           = Column(String(10), nullable=False, default="checked")  # checked | shift | days
    keep_until     = Column(Date)
    created_at     = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class CardMemoCheck(Base):
    """전달·메모 확인 기록."""
    __tablename__ = "skywatch_card_memo_checks"

    card_id    = Column(Integer, ForeignKey("skywatch_log_cards.id", ondelete="CASCADE"), primary_key=True)
    user_id    = Column(Integer, ForeignKey("skywatch_users.id", ondelete="CASCADE"), primary_key=True)
    checked_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
