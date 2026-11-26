from sqlalchemy import (
    Boolean, Column, Date, DateTime, ForeignKey,
    Integer, String, Text, func,
)

try:
    from pgvector.sqlalchemy import Vector
    HAS_PGVECTOR = True
except ImportError:
    Vector = None
    HAS_PGVECTOR = False

from app.db.database import Base


class Issue(Base):
    __tablename__ = "skywatch_issues"

    id             = Column(Integer, primary_key=True)
    source_seq     = Column(Integer, unique=True, nullable=True)
    kac_pr_no      = Column(String(20), nullable=True)
    lm_pr_no       = Column(String(50), nullable=True)
    title          = Column(String(500), nullable=False)
    content        = Column(Text, nullable=True)
    status         = Column(String(20), nullable=False, default="진행중")
    acc_type       = Column(String(5), nullable=True)
    keyword        = Column(String(200), nullable=True)
    version        = Column(String(100), nullable=True)
    mod_version    = Column(String(100), nullable=True)
    reg_date       = Column(Date, nullable=False)
    action_date    = Column(Date, nullable=True)
    acc_pr         = Column(String(50), nullable=True)

    created_by     = Column(Integer, ForeignKey("skywatch_users.id"), nullable=True)
    assigned_to    = Column(Integer, ForeignKey("skywatch_users.id"), nullable=True)
    created_at     = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    last_edited_by = Column(Integer, ForeignKey("skywatch_users.id"), nullable=True)
    is_deleted     = Column(Boolean, nullable=False, default=False)
    deleted_by     = Column(Integer, ForeignKey("skywatch_users.id"), nullable=True)
    deleted_at     = Column(DateTime(timezone=True), nullable=True)


class IssueComment(Base):
    __tablename__ = "skywatch_issue_comments"

    id           = Column(Integer, primary_key=True)
    issue_id     = Column(Integer, ForeignKey("skywatch_issues.id", ondelete="CASCADE"), nullable=False)
    content      = Column(Text, nullable=False)
    is_certified = Column(Boolean, nullable=False, default=False)
    created_by   = Column(Integer, ForeignKey("skywatch_users.id"), nullable=True)
    created_at   = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    is_deleted   = Column(Boolean, nullable=False, default=False)


class IssueVector(Base):
    __tablename__ = "skywatch_issue_vectors"

    id          = Column(Integer, primary_key=True)
    issue_id    = Column(Integer, ForeignKey("skywatch_issues.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False, default=0)
    chunk_text  = Column(Text, nullable=True)
    embedding   = Column(Vector(1024) if HAS_PGVECTOR and Vector else Text, nullable=True)
    created_at  = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
