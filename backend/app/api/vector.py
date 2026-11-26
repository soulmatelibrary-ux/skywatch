"""벡터 검색 관리 API 라우터."""
import uuid
import logging
import threading
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.config import ReindexJob
from app.models.user import User
from app.schemas.common import ApiResponse
from app.services import vector_service
from app.services import card_vector_service
from app.services.vector_model import get_current_model_name, get_available_models

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/vector", tags=["vector"])


class VectorStatusOut:
    """벡터화 상태 응답."""
    def __init__(self, vectorized_count: int, total_count: int, coverage: float):
        self.vectorized_count = vectorized_count
        self.total_count = total_count
        self.coverage = coverage


@router.get("/status", response_model=ApiResponse[dict])
def get_vector_status(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """현재 일지 벡터화 상태 조회."""
    from sqlalchemy import select, func
    from app.models.log import Log, LogVector

    total = db.scalar(select(func.count(Log.id)).where(Log.is_deleted.is_(False)))
    vectorized_count = db.scalar(select(func.count(LogVector.log_id.distinct())))
    coverage = (vectorized_count / total * 100) if total > 0 else 0

    return ApiResponse.ok(data={
        "vectorized_count": vectorized_count,
        "total_count": total,
        "coverage": round(coverage, 1),
        "current_model": get_current_model_name(db),
    })


@router.get("/cards/status", response_model=ApiResponse[dict])
def get_card_vector_status(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """카드 벡터화 현황 조회."""
    from sqlalchemy import select, func
    from app.models.log import LogCard, CardVector

    total = db.scalar(select(func.count(LogCard.id)).where(LogCard.is_deleted.is_(False)))

    try:
        vectorized_count = db.scalar(select(func.count(CardVector.card_id.distinct())))
    except Exception:
        db.rollback()
        vectorized_count = 0

    coverage = (vectorized_count / total * 100) if total > 0 else 0

    return ApiResponse.ok(data={
        "vectorized_count": vectorized_count,
        "total_count": total,
        "coverage": round(coverage, 1),
        "model": "kure-v1",
    })


@router.post("/cards/backfill", response_model=ApiResponse[dict], status_code=202)
def start_card_backfill(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """미벡터화 카드 일괄 벡터화 시작 (배경 스레드)."""
    from app.db.session import SessionLocal

    def run():
        _db = SessionLocal()
        try:
            result = card_vector_service.backfill_card_vectors(_db)
            logger.info(f"Card backfill complete: {result}")
        except Exception as e:
            logger.error(f"Card backfill failed: {e}", exc_info=True)
        finally:
            _db.close()

    threading.Thread(target=run, daemon=True).start()
    return ApiResponse.ok(data={"status": "started"}, message="카드 벡터화가 시작되었습니다")


@router.post("/backfill", response_model=ApiResponse[dict], status_code=202)
def start_backfill(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """미벡터화된 일지 일괄 벡터화 시작 (배경 작업)."""
    from sqlalchemy import select

    # 진행 중인 작업 확인
    running = db.scalar(
        select(ReindexJob).where(ReindexJob.status == 'running')
    )
    if running:
        raise HTTPException(status_code=409, detail="벡터화가 이미 진행 중입니다")

    # 새 작업 생성
    job_id = str(uuid.uuid4())
    model_name = vector_service.get_current_model_name(db)

    job = ReindexJob(
        job_id=job_id,
        model_name=model_name,
        status='pending',
    )
    db.add(job)
    db.commit()

    # 배경 스레드에서 벡터화 실행
    def run_backfill():
        try:
            logger.info(f"Starting backfill for job {job_id}")
            vector_service.reindex_all_logs(model_name, job_id)
            logger.info(f"Backfill completed for job {job_id}")
        except Exception as e:
            logger.error(f"Backfill failed for job {job_id}: {e}", exc_info=True)

    thread = threading.Thread(target=run_backfill, daemon=True)
    thread.start()

    return ApiResponse.ok(
        data={"job_id": job_id, "status": "started"},
        message="벡터화 작업이 시작되었습니다"
    )


@router.get("/job/{job_id}", response_model=ApiResponse[dict])
def get_job_status(
    job_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """벡터화 작업 진행상황 조회."""
    status = vector_service.get_reindex_job_status(db, job_id)
    if not status:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다")
    return ApiResponse.ok(data=status)


@router.get("/inquiries/status", response_model=ApiResponse[dict])
def get_inquiry_vector_status(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """문의사항 벡터화 현황 조회."""
    from sqlalchemy import select, func
    from app.models.inquiry import Inquiry, InquiryVector

    total = db.scalar(select(func.count(Inquiry.id)).where(Inquiry.is_deleted.is_(False)))
    try:
        vectorized = db.scalar(select(func.count(InquiryVector.inquiry_id.distinct())))
    except Exception:
        db.rollback()
        vectorized = 0
    coverage = (vectorized / total * 100) if total else 0
    return ApiResponse.ok(data={
        "vectorized_count": vectorized,
        "total_count": total,
        "coverage": round(coverage, 1),
        "model": "kure-v1",
    })


@router.get("/issues/status", response_model=ApiResponse[dict])
def get_issue_vector_status(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """PR관리 벡터화 현황 조회."""
    from sqlalchemy import select, func
    from app.models.issue import Issue, IssueVector

    total = db.scalar(select(func.count(Issue.id)).where(Issue.is_deleted.is_(False)))
    try:
        vectorized = db.scalar(select(func.count(IssueVector.issue_id.distinct())))
    except Exception:
        db.rollback()
        vectorized = 0
    coverage = (vectorized / total * 100) if total else 0
    return ApiResponse.ok(data={
        "vectorized_count": vectorized,
        "total_count": total,
        "coverage": round(coverage, 1),
        "model": "kure-v1",
    })


@router.get("/tech-docs/status", response_model=ApiResponse[dict])
def get_tech_doc_vector_status(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """기록문서 벡터화 현황 조회."""
    from sqlalchemy import select, func
    from app.models.tech_doc import TechDoc, TechDocVector

    total = db.scalar(select(func.count(TechDoc.id)).where(TechDoc.is_deleted.is_(False)))
    try:
        vectorized = db.scalar(select(func.count(TechDocVector.tech_doc_id.distinct())))
    except Exception:
        db.rollback()
        vectorized = 0
    coverage = (vectorized / total * 100) if total else 0
    return ApiResponse.ok(data={
        "vectorized_count": vectorized,
        "total_count": total,
        "coverage": round(coverage, 1),
        "model": "kure-v1",
    })


@router.post("/inquiries/backfill", response_model=ApiResponse[dict], status_code=202)
def start_inquiry_backfill(
    _: User = Depends(get_current_user),
):
    """미벡터화 문의사항 일괄 벡터화 시작 (배경 스레드)."""
    from app.db.session import SessionLocal
    from app.services import inquiry_vector_service

    if inquiry_vector_service.is_backfill_running():
        raise HTTPException(status_code=409, detail="문의사항 벡터화가 이미 진행 중입니다")

    def run():
        inquiry_vector_service._backfill_running = True
        _db = SessionLocal()
        try:
            count = inquiry_vector_service.vectorize_pending_inquiries(_db)
            logger.info(f"[문의사항 벡터화] {count}건 완료")
        except Exception as e:
            logger.error(f"[문의사항 벡터화 실패] {e}", exc_info=True)
        finally:
            inquiry_vector_service._backfill_running = False
            _db.close()

    threading.Thread(target=run, daemon=True).start()
    return ApiResponse.ok(data={"status": "started"}, message="문의사항 벡터화가 시작되었습니다")


@router.post("/issues/backfill", response_model=ApiResponse[dict], status_code=202)
def start_issue_backfill(
    _: User = Depends(get_current_user),
):
    """미벡터화 PR관리 일괄 벡터화 시작 (배경 스레드)."""
    from app.db.session import SessionLocal
    from app.services import issue_vector_service

    if issue_vector_service.is_backfill_running():
        raise HTTPException(status_code=409, detail="PR관리 벡터화가 이미 진행 중입니다")

    def run():
        issue_vector_service._backfill_running = True
        _db = SessionLocal()
        try:
            count = issue_vector_service.vectorize_pending_issues(_db)
            logger.info(f"[PR관리 벡터화] {count}건 완료")
        except Exception as e:
            logger.error(f"[PR관리 벡터화 실패] {e}", exc_info=True)
        finally:
            issue_vector_service._backfill_running = False
            _db.close()

    threading.Thread(target=run, daemon=True).start()
    return ApiResponse.ok(data={"status": "started"}, message="PR관리 벡터화가 시작되었습니다")


@router.post("/tech-docs/backfill", response_model=ApiResponse[dict], status_code=202)
def start_tech_doc_backfill(
    _: User = Depends(get_current_user),
):
    """미벡터화 기록문서 일괄 벡터화 시작 (배경 스레드)."""
    from app.db.session import SessionLocal
    from app.services import tech_doc_vector_service

    if tech_doc_vector_service.is_backfill_running():
        raise HTTPException(status_code=409, detail="기록문서 벡터화가 이미 진행 중입니다")

    def run():
        tech_doc_vector_service._backfill_running = True
        _db = SessionLocal()
        try:
            count = tech_doc_vector_service.vectorize_pending_tech_docs(_db)
            logger.info(f"[기록문서 벡터화] {count}건 완료")
        except Exception as e:
            logger.error(f"[기록문서 벡터화 실패] {e}", exc_info=True)
        finally:
            tech_doc_vector_service._backfill_running = False
            _db.close()

    threading.Thread(target=run, daemon=True).start()
    return ApiResponse.ok(data={"status": "started"}, message="기록문서 벡터화가 시작되었습니다")


@router.get("/models", response_model=ApiResponse[list])
def get_available_models(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """사용 가능한 임베딩 모델 목록."""
    models = get_available_models()
    current = get_current_model_name(db)
    return ApiResponse.ok(data=[
        {**m, "is_active": m["id"] == current}
        for m in models
    ])
