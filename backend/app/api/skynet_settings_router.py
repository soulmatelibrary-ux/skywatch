# SkyNet 설정 API 라우터 — 부서/키워드 관리 및 게시판 크롤링 제어
import json
import logging
import urllib.request
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.api.deps import get_current_user
from app.db.skynet_session import get_skynet_db as get_db
from app.core.config import settings
from app.services import skynet_settings_service as svc

router = APIRouter(
    prefix="/api/skynet",
    tags=["skynet-settings"],
    dependencies=[Depends(get_current_user)],
)


class DeptToggleIn(BaseModel):
    enabled: bool


class KeywordIn(BaseModel):
    keyword: str


# ── 부서 ──────────────────────────────────────────────────────────────────────

@router.get("/departments/all")
def list_all_departments(db: Session = Depends(get_db)):
    """활성/비활성 포함 전체 부서 목록 (설정 화면용)."""
    try:
        rows = db.execute(
            text("SELECT id, name, dept_id, doc_type, enabled FROM crawl_departments ORDER BY name")
        ).mappings().all()
        return [dict(r) for r in rows]
    except Exception:
        logger.warning("crawl_departments 조회 실패 — SKYNET_DATABASE_URL 설정을 확인하세요", exc_info=True)
        return []


@router.patch("/departments/{dept_id}")
def toggle_department(dept_id: int, body: DeptToggleIn, db: Session = Depends(get_db)):
    try:
        return svc.toggle_department(db, dept_id, body.enabled)
    except svc.DepartmentNotFoundError:
        raise HTTPException(status_code=404, detail="부서를 찾을 수 없습니다.")


# ── 키워드 ────────────────────────────────────────────────────────────────────

@router.get("/keywords")
def list_keywords(db: Session = Depends(get_db)):
    try:
        return svc.get_keywords(db)
    except Exception:
        logger.warning("crawl_keywords 조회 실패 — SKYNET_DATABASE_URL 설정을 확인하세요", exc_info=True)
        return []


@router.post("/keywords", status_code=201)
def add_keyword(body: KeywordIn, db: Session = Depends(get_db)):
    if not body.keyword.strip():
        raise HTTPException(status_code=422, detail="키워드를 입력하세요.")
    try:
        return svc.add_keyword(db, body.keyword)
    except svc.DuplicateKeywordError:
        raise HTTPException(status_code=409, detail="이미 등록된 키워드입니다.")


@router.delete("/keywords/{keyword_id}", status_code=204)
def delete_keyword(keyword_id: int, db: Session = Depends(get_db)):
    try:
        svc.delete_keyword(db, keyword_id)
    except svc.KeywordNotFoundError:
        raise HTTPException(status_code=404, detail="키워드를 찾을 수 없습니다.")


# ── 게시판 크롤링 ──────────────────────────────────────────────────────────────

@router.post("/board/crawl-now")
def board_crawl_now():
    try:
        req = urllib.request.Request(
            f"{settings.SKYNET_API_URL}/board/crawl-now", method='POST', data=b''
        )
        with urllib.request.urlopen(req, timeout=5) as r:
            return json.loads(r.read())
    except Exception:
        raise HTTPException(status_code=503, detail="SkyNet 서비스에 연결할 수 없습니다.")
