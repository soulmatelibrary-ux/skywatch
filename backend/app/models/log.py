from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey,
    Integer, String, Text, UniqueConstraint, func, ARRAY, LargeBinary,
)

try:
    from pgvector.sqlalchemy import Vector
    HAS_PGVECTOR = True
except ImportError:
    Vector = None
    HAS_PGVECTOR = False
from sqlalchemy.orm import relationship

from app.db.database import Base


class Log(Base):
    __tablename__ = "skywatch_logs"
    __table_args__ = (UniqueConstraint("date", "shift_type"),)

    id             = Column(Integer, primary_key=True)
    author_id      = Column(Integer, ForeignKey("skywatch_users.id"), nullable=False)
    date           = Column(Date, nullable=False)
    shift_type     = Column(String(10), nullable=False)
    title          = Column(String(255))
    tags           = Column(ARRAY(String), nullable=False, default=list)
    source_seq     = Column(Integer, nullable=True)   # 레거시 CSV seq
    created_at     = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), nullable=False, server_default=func.now(),
                            onupdate=func.now())
    created_by     = Column(Integer, ForeignKey("skywatch_users.id"))
    last_edited_by = Column(Integer, ForeignKey("skywatch_users.id"))
    is_deleted     = Column(Boolean, nullable=False, default=False)
    deleted_by     = Column(Integer, ForeignKey("skywatch_users.id"))
    deleted_at     = Column(DateTime(timezone=True))

    author       = relationship("User", foreign_keys=[author_id])
    cards        = relationship("LogCard", back_populates="log", order_by="LogCard.position")
    participants = relationship("LogParticipant", back_populates="log")
    comments     = relationship("Comment", back_populates="log")


class CardCategory(Base):
    __tablename__ = "skywatch_card_categories"

    id         = Column(Integer, primary_key=True)
    name       = Column(String(50), nullable=False)
    color      = Column(String(20))
    sort_order = Column(Integer, nullable=False, default=0)
    is_active  = Column(Boolean, nullable=False, default=True)
    created_by = Column(Integer, ForeignKey("skywatch_users.id"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class LogCard(Base):
    __tablename__ = "skywatch_log_cards"

    id               = Column(Integer, primary_key=True)
    log_id           = Column(Integer, ForeignKey("skywatch_logs.id", ondelete="CASCADE"), nullable=False)
    category_id      = Column(Integer, ForeignKey("skywatch_card_categories.id"))
    position         = Column(Integer, nullable=False, default=0)
    title            = Column(String(255), nullable=False)
    content          = Column(Text)
    status           = Column(String(20), nullable=False, default="open")
    completed_by     = Column(Integer, ForeignKey("skywatch_users.id"))
    completed_at     = Column(DateTime(timezone=True))
    status_changed_by = Column(Integer, ForeignKey("skywatch_users.id"))
    status_changed_at = Column(DateTime(timezone=True))
    created_by       = Column(Integer, ForeignKey("skywatch_users.id"), nullable=False)
    last_edited_by   = Column(Integer, ForeignKey("skywatch_users.id"))
    created_at       = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), nullable=False, server_default=func.now(),
                              onupdate=func.now())
    is_deleted        = Column(Boolean, nullable=False, default=False)
    deleted_by        = Column(Integer, ForeignKey("skywatch_users.id"))
    deleted_at        = Column(DateTime(timezone=True))

    log      = relationship("Log", back_populates="cards")
    category = relationship("CardCategory", foreign_keys=[category_id])


class LogParticipant(Base):
    __tablename__ = "skywatch_log_participants"
    __table_args__ = (UniqueConstraint("log_id", "user_id"),)

    id      = Column(Integer, primary_key=True)
    log_id  = Column(Integer, ForeignKey("skywatch_logs.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("skywatch_users.id"), nullable=False)
    role    = Column(String(20), nullable=False)
    sub_for = Column(Integer, ForeignKey("skywatch_users.id"))
    note    = Column(Text)

    log  = relationship("Log", back_populates="participants")
    user = relationship("User", foreign_keys=[user_id])


class LogRead(Base):
    __tablename__ = "skywatch_log_reads"

    log_id  = Column(Integer, ForeignKey("skywatch_logs.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(Integer, ForeignKey("skywatch_users.id", ondelete="CASCADE"), primary_key=True)
    read_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class LogAcknowledgment(Base):
    __tablename__ = "skywatch_log_acknowledgments"

    log_id  = Column(Integer, ForeignKey("skywatch_logs.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(Integer, ForeignKey("skywatch_users.id", ondelete="CASCADE"), primary_key=True)
    acked_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class LogVersion(Base):
    __tablename__ = "skywatch_log_versions"

    id            = Column(Integer, primary_key=True)
    log_id        = Column(Integer, ForeignKey("skywatch_logs.id", ondelete="CASCADE"), nullable=False)
    editor_id     = Column(Integer, ForeignKey("skywatch_users.id"), nullable=False)
    snapshot_json = Column(Text, nullable=False)
    edited_at     = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class CardLink(Base):
    __tablename__ = "skywatch_card_links"
    __table_args__ = (UniqueConstraint("source_card_id", "target_card_id"),)

    id             = Column(Integer, primary_key=True)
    source_card_id = Column(Integer, ForeignKey("skywatch_log_cards.id", ondelete="CASCADE"), nullable=False)
    target_card_id = Column(Integer, ForeignKey("skywatch_log_cards.id", ondelete="CASCADE"), nullable=False)
    created_by     = Column(Integer, ForeignKey("skywatch_users.id"), nullable=False)
    created_at     = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class CardStatus(Base):
    """사용자 정의 카드 상태 마스터."""
    __tablename__ = "skywatch_card_statuses"

    id         = Column(Integer, primary_key=True)
    key        = Column(String(30), nullable=False, unique=True)
    label      = Column(String(50), nullable=False)
    color      = Column(String(20))
    sort_order = Column(Integer, nullable=False, default=0)
    is_system  = Column(Boolean, nullable=False, default=False)
    is_active  = Column(Boolean, nullable=False, default=True)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_by = Column(Integer, ForeignKey("skywatch_users.id"))
    deleted_at = Column(DateTime(timezone=True))
    created_by = Column(Integer, ForeignKey("skywatch_users.id"))
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class Comment(Base):
    __tablename__ = "skywatch_comments"

    id         = Column(Integer, primary_key=True)
    log_id     = Column(Integer, ForeignKey("skywatch_logs.id", ondelete="CASCADE"), nullable=False)
    author_id  = Column(Integer, ForeignKey("skywatch_users.id"), nullable=False)
    parent_id  = Column(Integer, ForeignKey("skywatch_comments.id"))
    body       = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(),
                        onupdate=func.now())
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_by = Column(Integer, ForeignKey("skywatch_users.id"))
    deleted_at = Column(DateTime(timezone=True))

    log    = relationship("Log", back_populates="comments")
    author = relationship("User", foreign_keys=[author_id])


class CommentReaction(Base):
    __tablename__ = "skywatch_comment_reactions"

    comment_id = Column(Integer, ForeignKey("skywatch_comments.id", ondelete="CASCADE"), primary_key=True)
    user_id    = Column(Integer, ForeignKey("skywatch_users.id", ondelete="CASCADE"), primary_key=True)
    emoji      = Column(String(10), primary_key=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class LogVector(Base):
    __tablename__ = "skywatch_log_vectors"
    __table_args__ = (UniqueConstraint("log_id", "chunk_no"),)

    id         = Column(Integer, primary_key=True)
    log_id     = Column(Integer, ForeignKey("skywatch_logs.id", ondelete="CASCADE"), nullable=False)
    chunk_no   = Column(Integer, nullable=False)
    chunk_text = Column(Text, nullable=False)
    embedding  = Column(LargeBinary, nullable=False)
    embedding_vector = Column(Vector(1024), nullable=True) if HAS_PGVECTOR else None
    model_name = Column(String(50), nullable=False, default='kure-v1')
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(),
                        onupdate=func.now())

    log = relationship("Log", foreign_keys=[log_id])


class CardVector(Base):
    """카드별 벡터 임베딩 (KURE-v1 기반 자연어 검색용)."""
    __tablename__ = "skywatch_card_vectors"
    __table_args__ = (UniqueConstraint("card_id", "chunk_no"),)

    id               = Column(Integer, primary_key=True)
    card_id          = Column(Integer, ForeignKey("skywatch_log_cards.id", ondelete="CASCADE"), nullable=False)
    chunk_no         = Column(Integer, nullable=False)
    chunk_text       = Column(Text, nullable=False)
    embedding        = Column(LargeBinary, nullable=False)
    embedding_vector = Column(Vector(1024), nullable=True) if HAS_PGVECTOR else None
    model_name       = Column(String(50), nullable=False, default='kure-v1')
    updated_at       = Column(DateTime(timezone=True), nullable=False, server_default=func.now(),
                              onupdate=func.now())

    card = relationship("LogCard", foreign_keys=[card_id])

