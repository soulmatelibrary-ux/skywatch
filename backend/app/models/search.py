from sqlalchemy import Column, DateTime, Integer, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import TSVECTOR

from app.db.database import Base


class SearchIndex(Base):
    __tablename__ = "skywatch_search_index"
    __table_args__ = (UniqueConstraint("target_type", "target_id"),)

    id           = Column(Integer, primary_key=True)
    target_type  = Column(String(20), nullable=False)
    target_id    = Column(Integer, nullable=False)
    content_text = Column(TSVECTOR)
    # embedding VECTOR(384) — pgvector 설치 후 마이그레이션으로 추가
    updated_at   = Column(DateTime(timezone=True), nullable=False, server_default=func.now(),
                          onupdate=func.now())


class SearchSuggestion(Base):
    """사용자 검색어 추천 — 검색 실행 시 UPSERT, 입력 시 prefix 매칭 조회."""
    __tablename__ = "skywatch_search_suggestions"

    id               = Column(Integer, primary_key=True)
    query_text       = Column(String(200), nullable=False, unique=True, index=True)
    search_count     = Column(Integer, nullable=False, default=1)
    result_count     = Column(Integer, nullable=False, default=0)
    last_searched_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    created_at       = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
