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

from sqlalchemy.orm import relationship
from app.db.database import Base


class TechDocCategory(Base):
    __tablename__ = "skywatch_tech_doc_categories"

    id            = Column(Integer, primary_key=True)
    project_code  = Column(String(30), nullable=False)
    category_code = Column(String(20), nullable=False)
    name          = Column(String(100), nullable=False)
    sort_order    = Column(Integer, nullable=False, default=0)
    is_active     = Column(Boolean, nullable=False, default=True)


class TechDoc(Base):
    __tablename__ = "skywatch_tech_docs"

    id             = Column(Integer, primary_key=True)
    legacy_seq     = Column(Integer, nullable=True)
    record_date    = Column(Date, nullable=True)
    project_code   = Column(String(30), nullable=True)
    category_code  = Column(String(20), nullable=True)
    title          = Column(String(500), nullable=True)
    content        = Column(Text, nullable=True)
    summary        = Column(Text, nullable=True)
    detail_summary = Column(Text, nullable=True)
    doc_type       = Column(String(100), nullable=True)
    adapt_version  = Column(String(50), nullable=True)
    service_date   = Column(Date, nullable=True)
    reference      = Column(Text, nullable=True)
    orig_user_id   = Column(String(20), nullable=True)
    author_id      = Column(Integer, ForeignKey("skywatch_users.id"), nullable=True)
    created_at     = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), nullable=False, server_default=func.now(),
                            onupdate=func.now())
    created_by     = Column(Integer, ForeignKey("skywatch_users.id"), nullable=True)
    last_edited_by = Column(Integer, ForeignKey("skywatch_users.id"), nullable=True)
    is_deleted     = Column(Boolean, nullable=False, default=False)

    author      = relationship("User", foreign_keys=[author_id])
    attachments = relationship("TechDocAttachment", back_populates="tech_doc",
                               primaryjoin="and_(TechDocAttachment.tech_doc_id==TechDoc.id, "
                                           "TechDocAttachment.is_deleted==False)")


class TechDocAttachment(Base):
    __tablename__ = "skywatch_tech_doc_attachments"

    id             = Column(Integer, primary_key=True)
    tech_doc_id    = Column(Integer, ForeignKey("skywatch_tech_docs.id"), nullable=False)
    legacy_doc_seq = Column(Integer, nullable=True)
    original_name  = Column(String(500), nullable=False)
    stored_name    = Column(String(500), nullable=False)
    file_extension = Column(String(20), nullable=True)
    content_text   = Column(Text, nullable=True)
    reg_date       = Column(Date, nullable=True)
    uploaded_by    = Column(Integer, ForeignKey("skywatch_users.id"), nullable=True)
    created_at     = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    is_deleted     = Column(Boolean, nullable=False, default=False)

    tech_doc = relationship("TechDoc", back_populates="attachments")


class TechDocVector(Base):
    __tablename__ = "skywatch_tech_doc_vectors"

    id          = Column(Integer, primary_key=True)
    tech_doc_id = Column(Integer, ForeignKey("skywatch_tech_docs.id", ondelete="CASCADE"),
                         nullable=False)
    chunk_index = Column(Integer, nullable=False, default=0)
    chunk_text  = Column(Text, nullable=True)
    embedding   = Column(Vector(1024) if HAS_PGVECTOR and Vector else Text, nullable=True)

    tech_doc = relationship("TechDoc")
