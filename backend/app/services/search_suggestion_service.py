"""검색어 추천 서비스 — 사용자 검색어 등록·조회."""
import logging

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from app.models.search import SearchSuggestion

logger = logging.getLogger(__name__)

_MIN_QUERY_LEN = 2       # 등록/조회 최소 글자 수
_MIN_SEARCH_COUNT = 2    # 추천에 노출되려면 최소 검색 횟수


def _normalize(q: str) -> str:
    """검색어 정규화: strip + 소문자 + 연속 공백 제거."""
    return " ".join(q.strip().lower().split())


def record_search(db: Session, query_text: str, result_count: int) -> None:
    """검색 실행 후 호출 — UPSERT로 횟수·결과 수 갱신."""
    normalized = _normalize(query_text)
    if len(normalized) < _MIN_QUERY_LEN:
        return

    try:
        stmt = pg_insert(SearchSuggestion).values(
            query_text=normalized,
            search_count=1,
            result_count=result_count,
            last_searched_at=func.now(),
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["query_text"],
            set_={
                "search_count": SearchSuggestion.search_count + 1,
                "result_count": result_count,
                "last_searched_at": func.now(),
            },
        )
        db.execute(stmt)
        db.commit()
    except Exception:
        logger.warning("검색어 추천 등록 실패", exc_info=True)
        try:
            db.rollback()
        except Exception:
            pass


def get_suggestions(db: Session, prefix: str, limit: int = 8) -> list[dict]:
    """prefix 매칭으로 추천 검색어 반환."""
    normalized = _normalize(prefix)
    if len(normalized) < _MIN_QUERY_LEN:
        return []

    # ILIKE 와일드카드 문자 이스케이프
    safe = normalized.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")

    try:
        rows = (
            db.query(SearchSuggestion.query_text, SearchSuggestion.search_count)
            .filter(
                SearchSuggestion.query_text.ilike(f"{safe}%"),
                SearchSuggestion.result_count > 0,
                SearchSuggestion.search_count >= _MIN_SEARCH_COUNT,
            )
            .order_by(SearchSuggestion.search_count.desc())
            .limit(limit)
            .all()
        )
        return [{"query_text": r.query_text, "search_count": r.search_count} for r in rows]
    except Exception:
        logger.warning("검색어 추천 조회 실패", exc_info=True)
        return []
