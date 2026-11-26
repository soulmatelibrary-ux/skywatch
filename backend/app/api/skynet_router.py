import json
import urllib.parse
import urllib.request
from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, Query, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.skynet_session import get_skynet_db as get_db
from app.services import skynet_service, skynet_search_service, skynet_vector_service
from app.core.config import settings

router = APIRouter(
    prefix="/api/skynet",
    tags=["skynet"],
    dependencies=[Depends(get_current_user)],
)


def _flask_get(path: str, timeout: int = 5):
    try:
        with urllib.request.urlopen(f"{settings.SKYNET_API_URL}{path}", timeout=timeout) as r:
            return json.loads(r.read())
    except Exception:
        return None


def _flask_post_form(path: str, data: dict, timeout: int = 30):
    try:
        encoded = urllib.parse.urlencode(data, doseq=True).encode()
        req = urllib.request.Request(
            f"{settings.SKYNET_API_URL}{path}",
            data=encoded,
            method="POST",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except Exception:
        return None


def _flask_post(path: str, timeout: int = 5):
    try:
        req = urllib.request.Request(
            f"{settings.SKYNET_API_URL}{path}",
            method="POST",
            data=b"",
        )
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except Exception:
        return None


@router.get("/search")
def unified_search(
    q: str = Query(""),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    semantic: bool = Query(False),
    db: Session = Depends(get_db),
):
    if semantic and q.strip():
        items, total = skynet_search_service.search_unified_with_semantic(db, q=q, page=page, size=size)
    else:
        items, total = skynet_search_service.search_unified(db, q=q, page=page, size=size)
        for item in items:
            if item.get("kind") == "board":
                item["badge"] = "게시판"
                item["badge_kind"] = "board"
            elif item.get("matched_keyword"):
                item["badge"] = "수집 목록"
                item["badge_kind"] = "crawl"
            else:
                item["badge"] = "전체문서"
                item["badge_kind"] = "all"
    total_pages = max(1, (total + size - 1) // size)
    return {"items": items, "total": total, "page": page, "size": size, "total_pages": total_pages}


@router.get("/vectors/status")
def vector_status(db: Session = Depends(get_db)):
    return skynet_vector_service.get_vector_coverage(db)


@router.post("/vectors/backfill")
def vector_backfill(db: Session = Depends(get_db)):
    from app.db.skynet_session import SkynetSessionLocal
    started = skynet_vector_service.start_backfill(SkynetSessionLocal)
    if not started:
        return {"ok": False, "message": "이미 임베딩 작업이 진행 중입니다."}
    return {"ok": True, "message": "백그라운드에서 임베딩 작업을 시작했습니다."}


@router.get("/departments")
def list_departments(db: Session = Depends(get_db)):
    return skynet_service.get_departments(db)


@router.get("/years")
def list_years(db: Session = Depends(get_db)):
    return skynet_service.get_available_years(db)


@router.get("/doc-stats")
def doc_stats(db: Session = Depends(get_db)):
    return skynet_service.get_doc_stats(db)


@router.get("/source-depts")
def source_depts(db: Session = Depends(get_db)):
    return skynet_service.get_source_depts(db)


@router.get("/documents")
def list_documents(
    q: str = Query(""),
    year: str = Query(""),
    source_dept: str = Query(""),
    keyword_only: bool = Query(False),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    items, total = skynet_service.get_documents(
        db,
        q=q,
        year=year,
        source_dept=source_dept,
        keyword_only=keyword_only,
        page=page,
        size=size,
    )
    total_pages = max(1, (total + size - 1) // size)
    return {"items": items, "total": total, "page": page, "size": size, "total_pages": total_pages}


@router.get("/board/stats")
def board_stats(db: Session = Depends(get_db)):
    stats = skynet_service.get_board_page_stats(db)
    board_url = settings.BOARD_DIRECT_URL
    if not board_url:
        flask_config = _flask_get("/config")
        if flask_config:
            board_url = flask_config.get("board_direct_url", "")
    stats["board_direct_url"] = board_url
    return stats


@router.get("/board")
def list_board(
    q: str = Query(""),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    items, total = skynet_service.get_board_posts(db, q=q, page=page, size=size)
    total_pages = max(1, (total + size - 1) // size)
    return {"items": items, "total": total, "page": page, "size": size, "total_pages": total_pages}


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    return skynet_service.get_dashboard_stats(db)


@router.get("/crawl/status")
def crawl_status():
    result = _flask_get("/crawl/status")
    if result is None:
        return {"status": "offline", "message": "SkyNet 서비스에 연결할 수 없습니다."}
    return result


@router.post("/crawl/start")
def crawl_start(db: Session = Depends(get_db)):
    started_at = datetime.now().astimezone()
    result = _flask_post("/crawl", timeout=180)
    if result is None:
        skynet_service.insert_skynet_crawl_log(
            db,
            target="docs",
            status="error",
            new_count=0,
            message=f"[{started_at.strftime('%Y-%m-%d %H:%M:%S')}] SkyNet 문서 수집 실패",
            started_at=started_at,
            finished_at=datetime.now().astimezone(),
        )
        raise HTTPException(status_code=503, detail="SkyNet 서비스에 연결할 수 없습니다.")
    rows = skynet_service.collect_recent_crawled_documents(db, started_at)
    skynet_service.insert_skynet_crawl_log(
        db,
        target="docs",
        status="ok",
        new_count=len(rows),
        message=skynet_service.build_crawl_log_message(
            started_at=started_at,
            result=result if isinstance(result, dict) else None,
            rows=rows,
        ),
        started_at=started_at,
        finished_at=datetime.now().astimezone(),
    )
    return result


@router.post("/departments")
def add_department(data: dict = Body(...), db: Session = Depends(get_db)):
    return skynet_service.add_department(db, data["name"], data["dept_id"], data["doc_type"])


@router.delete("/departments/{dept_id}")
def delete_department(dept_id: int, db: Session = Depends(get_db)):
    skynet_service.delete_department(db, dept_id)
    return {"ok": True}


@router.get("/board/keywords")
def list_board_keywords(db: Session = Depends(get_db)):
    return skynet_service.get_board_keywords(db)


@router.post("/board/keywords")
def add_board_keyword(data: dict = Body(...), db: Session = Depends(get_db)):
    return skynet_service.add_board_keyword(db, data["keyword"])


@router.delete("/board/keywords/{kw_id}")
def delete_board_keyword(kw_id: int, db: Session = Depends(get_db)):
    skynet_service.delete_board_keyword(db, kw_id)
    return {"ok": True}


@router.post("/board/posts/delete")
def delete_board_posts(data: dict = Body(...), db: Session = Depends(get_db)):
    post_ids = data.get("post_ids", [])
    if not post_ids:
        raise HTTPException(status_code=400, detail="post_ids is required")
    if not isinstance(post_ids, list) or not all(isinstance(pid, int) for pid in post_ids):
        raise HTTPException(status_code=400, detail="post_ids must be list of integers")
    deleted_count = skynet_service.delete_board_posts(db, post_ids)
    return {"ok": True, "deleted": deleted_count, "message": f"{deleted_count}개 게시글이 삭제되었습니다"}


@router.get("/settings/crawl")
def get_crawl_settings(db: Session = Depends(get_db)):
    return skynet_service.get_crawl_settings(db)


@router.post("/settings/crawl")
def save_crawl_settings(data: dict = Body(...), db: Session = Depends(get_db)):
    skynet_service.save_crawl_settings(db, data.get("auto_crawl_times", []), data.get("crawl_speed", "balanced"))
    return {"ok": True}


@router.post("/session")
def set_session(data: dict = Body(...)):
    jsessionid = (data.get("jsessionid") or "").strip()
    if not jsessionid:
        raise HTTPException(status_code=400, detail="jsessionid is required")
    result = _flask_post_form("/login/manual", {"jsessionid": jsessionid}, timeout=20)
    if result is None:
        raise HTTPException(status_code=503, detail="SkyNet 서비스에 연결할 수 없습니다.")
    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=result.get("message", "세션 저장 실패"))
    return result


@router.post("/session/auto")
def auto_detect_session():
    result = _flask_post_form("/login/auto", {}, timeout=30)
    if result is None:
        raise HTTPException(status_code=503, detail="SkyNet 서비스에 연결할 수 없습니다.")
    if not result.get("ok"):
        raise HTTPException(status_code=400, detail=result.get("message", "자동 감지 실패"))
    return result


class ManualBatchRequest(BaseModel):
    start_date: str
    end_date: str
    warmup_count: int = Field(default=15, ge=5, le=50)
    dept_names: list[str] = Field(default_factory=list)
    interval_seconds: int = Field(default=20, ge=20, le=300)

    @field_validator("start_date", "end_date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError(f"날짜 형식이 잘못됐습니다: '{v}' (YYYY-MM-DD를 사용하세요)")
        return v


@router.post("/manual/batch")
def manual_batch(data: ManualBatchRequest, db: Session = Depends(get_db)):
    started_at = datetime.now().astimezone()
    payload = {
        "mode": "range",
        "start_date": data.start_date,
        "end_date": data.end_date,
        "warmup_count": str(data.warmup_count),
        "dept_names": [name for name in data.dept_names if str(name).strip()],
        "interval_seconds": str(data.interval_seconds),
    }
    result = _flask_post_form("/crawl", payload, timeout=180)
    if result is None:
        skynet_service.insert_skynet_crawl_log(
            db,
            target="docs",
            status="error",
            new_count=0,
            message=f"[{started_at.strftime('%Y-%m-%d %H:%M:%S')}] SkyNet 문서 수집 실패",
            started_at=started_at,
            finished_at=datetime.now().astimezone(),
        )
        raise HTTPException(status_code=503, detail="SkyNet 서비스에 연결할 수 없습니다.")
    rows = skynet_service.collect_recent_crawled_documents(db, started_at)
    skynet_service.insert_skynet_crawl_log(
        db,
        target="docs",
        status="ok",
        new_count=len(rows),
        message=skynet_service.build_crawl_log_message(
            started_at=started_at,
            result=result if isinstance(result, dict) else None,
            rows=rows,
        ),
        started_at=started_at,
        finished_at=datetime.now().astimezone(),
    )
    return result


@router.get("/crawl/logs")
def crawl_logs(day: str = Query(""), limit: int = Query(30, ge=1, le=100), db: Session = Depends(get_db)):
    return {
        "items": skynet_service.get_crawl_logs(db, day=day or None, limit=limit),
        "day": day or str(date.today()),
    }


@router.get("/today-docs")
def today_docs(db: Session = Depends(get_db)):
    items = skynet_service.get_today_keyword_docs(db)
    return {"items": items, "date": str(date.today())}


@router.get("/today-board")
def today_board(db: Session = Depends(get_db)):
    items = skynet_service.get_today_keyword_board_posts(db)
    board_url = settings.BOARD_DIRECT_URL
    if not board_url:
        flask_config = _flask_get("/config")
        if flask_config:
            board_url = flask_config.get("board_direct_url", "")
    return {"items": items, "date": str(date.today()), "board_direct_url": board_url}


@router.post("/keywords/rematch")
def keywords_rematch():
    result = _flask_post("/settings/keyword/rematch", timeout=60)
    if result is None:
        raise HTTPException(status_code=503, detail="SkyNet 서비스에 연결할 수 없습니다.")
    return result


@router.post("/keywords/recrawl")
def keywords_recrawl():
    result = _flask_post("/settings/keyword/recrawl")
    if result is None:
        raise HTTPException(status_code=503, detail="SkyNet 서비스에 연결할 수 없습니다.")
    return result


@router.post("/documents/unmatch")
def unmatch_documents(data: dict = Body(...), db: Session = Depends(get_db)):
    doc_ids = data.get("doc_ids", [])
    if not doc_ids:
        raise HTTPException(status_code=400, detail="doc_ids is required")
    if not isinstance(doc_ids, list) or not all(isinstance(i, int) for i in doc_ids):
        raise HTTPException(status_code=400, detail="doc_ids must be list of integers")
    count = skynet_service.unmatch_documents(db, doc_ids)
    return {"ok": True, "unmatched": count}


@router.post("/documents/match")
def match_documents(data: dict = Body(...), db: Session = Depends(get_db)):
    """수동 매칭 — 선택한 문서를 지정 키워드로 매칭문서에 추가."""
    doc_ids = data.get("doc_ids", [])
    keyword = (data.get("keyword") or "").strip()
    if not doc_ids:
        raise HTTPException(status_code=400, detail="doc_ids is required")
    if not isinstance(doc_ids, list) or not all(isinstance(i, int) for i in doc_ids):
        raise HTTPException(status_code=400, detail="doc_ids must be list of integers")
    if not keyword:
        raise HTTPException(status_code=400, detail="keyword is required")
    count = skynet_service.match_documents(db, doc_ids, keyword)
    return {"ok": True, "matched": count}


@router.post("/documents/{doc_id}/memo")
def save_document_memo(doc_id: int, data: dict = Body(...), db: Session = Depends(get_db)):
    memo = (data.get("memo") or "").strip()
    ok = skynet_service.save_document_memo(db, doc_id, memo)
    if not ok:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다")
    return {"ok": True, "memo": memo}
