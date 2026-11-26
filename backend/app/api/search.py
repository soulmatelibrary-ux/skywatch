"""통합 검색 API 라우터."""
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.search import UnifiedSearchOut
from app.services import search_service, search_suggestion_service

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("/unified", response_model=ApiResponse[UnifiedSearchOut])
def unified_search(
    q: str = Query("", max_length=200),
    source: Literal["all", "skywatch"] = Query("all"),
    target: Literal["all", "log", "card", "comment", "inquiry", "tech_doc", "issue"] = Query("all"),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    status: str | None = Query(None, max_length=20),
    team: str | None = Query(None, max_length=10),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = search_service.unified_search(
        db,
        q=q,
        source=source,
        target=target,
        page=page,
        page_size=page_size,
        date_from=date_from,
        date_to=date_to,
        status=status,
        team=team,
    )
    # 검색어 추천 DB에 등록 (첫 페이지 요청 시만)
    if q.strip() and page == 1:
        total = sum(result.facets.by_target.values()) if hasattr(result, "facets") else 0
        search_suggestion_service.record_search(db, q, total)
    return ApiResponse.ok(data=result)


@router.get("/suggestions")
def search_suggestions(
    q: str = Query("", max_length=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """검색어 자동완성 추천 목록."""
    items = search_suggestion_service.get_suggestions(db, q)
    return ApiResponse.ok(data=items)
