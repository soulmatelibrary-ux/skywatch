"""관리자 전용 유틸리티 API."""
import os
import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, validator
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.core.config import settings
from app.models.schedule import Attachment
from app.models.user import User
from app.models.config import ReindexJob
from app.schemas.common import ApiResponse
from app.services import vector_service

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ===== Pydantic 스키마 =====
class VectorConfigResponse(BaseModel):
	current_model: str
	latest_job: dict = None


class VectorReindexRequest(BaseModel):
	model_name: str

	@validator('model_name')
	def validate_model_name(cls, v):
		if v not in vector_service.AVAILABLE_MODELS:
			raise ValueError(f"Unknown model: {v}")
		return v


@router.get("/vector-models", response_model=ApiResponse[list])
def list_vector_models(current_user: User = Depends(get_current_user)):
	"""사용 가능한 벡터 모델 목록."""
	if current_user.role != "admin":
		raise HTTPException(403, "관리자만 실행할 수 있습니다")
	return ApiResponse.ok(data=vector_service.get_available_models())


@router.get("/vector-config", response_model=ApiResponse[VectorConfigResponse])
def get_vector_config(
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	"""현재 벡터 모델 설정 및 최신 작업 상태."""
	if current_user.role != "admin":
		raise HTTPException(403, "관리자만 실행할 수 있습니다")

	current_model = vector_service.get_current_model_name(db)
	latest_job = vector_service.get_latest_reindex_job(db)

	return ApiResponse.ok(data=VectorConfigResponse(
		current_model=current_model,
		latest_job=latest_job,
	))


@router.post("/vector-reindex", response_model=ApiResponse[dict])
def start_vector_reindex(
	request: VectorReindexRequest,
	background_tasks: BackgroundTasks,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	"""새 모델로 전체 일지 재벡터화 시작 (백그라운드)."""
	if current_user.role != "admin":
		raise HTTPException(403, "관리자만 실행할 수 있습니다")

	if request.model_name not in vector_service.AVAILABLE_MODELS:
		raise HTTPException(400, f"Unknown model: {request.model_name}")

	# 현재 진행 중인 작업 확인
	latest_job = vector_service.get_latest_reindex_job(db)
	if latest_job and latest_job['status'] == 'running':
		raise HTTPException(409, "재벡터화 작업이 이미 진행 중입니다")

	# 작업 생성
	job_id = str(uuid.uuid4())
	job = ReindexJob(
		job_id=job_id,
		model_name=request.model_name,
		status='pending',
	)
	db.add(job)
	db.commit()

	# 백그라운드 작업 시작 (함수 내에서 DB 세션 관리)
	background_tasks.add_task(
		vector_service.reindex_all_logs,
		model_name=request.model_name,
		job_id=job_id,
	)

	return ApiResponse.ok(data={
		"job_id": job_id,
		"model": request.model_name,
		"status": "pending",
		"message": f"{request.model_name}로 재벡터화를 시작했습니다",
	})


@router.get("/vector-reindex/{job_id}", response_model=ApiResponse[dict])
def get_reindex_status(
	job_id: str,
	db: Session = Depends(get_db),
	current_user: User = Depends(get_current_user),
):
	"""재벡터화 작업 진행 상황 조회."""
	if current_user.role != "admin":
		raise HTTPException(403, "관리자만 실행할 수 있습니다")

	status = vector_service.get_reindex_job_status(db, job_id)
	if not status:
		raise HTTPException(404, "작업을 찾을 수 없습니다")

	return ApiResponse.ok(data=status)


@router.post("/sync-file-sizes", response_model=ApiResponse[dict])
def sync_file_sizes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """uploads/ 폴더를 스캔하여 file_size=0인 첨부파일 레코드를 실제 크기로 갱신."""
    if current_user.role != "admin":
        raise HTTPException(403, "관리자만 실행할 수 있습니다")

    upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "uploads")
    upload_dir = os.path.normpath(upload_dir)

    atts = db.query(Attachment).filter(
        Attachment.is_deleted.is_(False),
        Attachment.file_size == 0,
    ).all()

    updated = skipped = missing = 0
    for att in atts:
        full_path = os.path.join(upload_dir, att.file_name)
        if not os.path.exists(full_path):
            # file_path 기준으로도 시도
            alt_path = os.path.join(upload_dir, os.path.basename(att.file_path or ""))
            if os.path.exists(alt_path):
                full_path = alt_path
            else:
                missing += 1
                continue
        size = os.path.getsize(full_path)
        if size == 0:
            skipped += 1
            continue
        att.file_size = size
        updated += 1

    db.commit()
    return ApiResponse.ok(data={
        "updated": updated,
        "skipped": skipped,
        "missing": missing,
        "total": len(atts),
    })


# ── 파일 정합성 검사 ──────────────────────────────────────────────────────────

class OrphanFile(BaseModel):
    file_name: str
    size_bytes: int

class MissingFile(BaseModel):
    file_name: str
    original_name: str
    owner_type: str
    owner_id: int

class FileAuditResult(BaseModel):
    matched: int
    total_folder: int
    total_db: int
    orphan_files: List[OrphanFile]
    missing_files: List[MissingFile]

class DeleteOrphansRequest(BaseModel):
    file_names: List[str]


def _upload_dir() -> str:
    base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "uploads")
    return os.path.normpath(base)


@router.get("/file-audit", response_model=ApiResponse[FileAuditResult])
def file_audit(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """uploads/ 폴더와 DB 첨부파일 레코드를 비교하여 정합성 검사."""
    if current_user.role != "admin":
        raise HTTPException(403, "관리자만 실행할 수 있습니다")

    upload_dir = _upload_dir()

    # 폴더 내 전체 파일 수집 (하위 디렉터리 포함)
    folder_files: dict[str, int] = {}
    if os.path.isdir(upload_dir):
        for root, _, files in os.walk(upload_dir):
            for fname in files:
                full = os.path.join(root, fname)
                folder_files[fname] = os.path.getsize(full)

    folder_set = set(folder_files)

    # DB 레코드 수집
    atts = db.query(Attachment).filter(Attachment.is_deleted.is_(False)).all()
    db_map: dict[str, Attachment] = {a.file_name: a for a in atts}
    db_set = set(db_map)

    orphan_names = folder_set - db_set
    missing_names = db_set - folder_set

    return ApiResponse.ok(data=FileAuditResult(
        matched=len(folder_set & db_set),
        total_folder=len(folder_set),
        total_db=len(db_set),
        orphan_files=sorted(
            [OrphanFile(file_name=n, size_bytes=folder_files[n]) for n in orphan_names],
            key=lambda x: x.file_name,
        ),
        missing_files=sorted(
            [
                MissingFile(
                    file_name=n,
                    original_name=db_map[n].original_name,
                    owner_type=db_map[n].owner_type,
                    owner_id=db_map[n].owner_id,
                )
                for n in missing_names
            ],
            key=lambda x: x.file_name,
        ),
    ))


@router.delete("/file-audit/orphans", response_model=ApiResponse[dict])
def delete_orphan_files(
    body: DeleteOrphansRequest,
    current_user: User = Depends(get_current_user),
):
    """고아 파일(DB 레코드 없는 파일) 선택 삭제."""
    if current_user.role != "admin":
        raise HTTPException(403, "관리자만 실행할 수 있습니다")

    upload_dir = _upload_dir()
    deleted = not_found = 0

    for file_name in body.file_names:
        safe = os.path.basename(file_name)
        if not safe or safe != file_name:
            continue
        # uploads 트리에서 파일 탐색
        found = False
        for root, _, files in os.walk(upload_dir):
            if safe in files:
                full_path = os.path.join(root, safe)
                # 경로 traversal 방지
                if os.path.commonpath([full_path, upload_dir]) == upload_dir:
                    os.remove(full_path)
                    deleted += 1
                    found = True
                break
        if not found:
            not_found += 1

    return ApiResponse.ok(data={"deleted": deleted, "not_found": not_found})
