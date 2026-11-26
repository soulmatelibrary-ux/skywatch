"""업무일지 CSV·엑셀 가져오기 API (관리자 전용). 일지 파일과 첨부 파일을 각각 올린다."""
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_admin
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.csv_import import CsvImportResult
from app.services import daily_csv_import as svc
from app.services.table_file_reader import MAX_TABLE_FILE_SIZE, TableFormatError

router = APIRouter(prefix="/api/admin/daily-import", tags=["admin"])


def _read(file: UploadFile) -> bytes:
    # 엔드포인트를 일반 def 로 두어 작업 스레드에서 실행 — 가져오는 동안 서버 전체가 멈추지 않게
    raw = file.file.read(MAX_TABLE_FILE_SIZE + 1)
    if not raw:
        raise HTTPException(400, "빈 파일입니다.")
    return raw


@router.post("/logs", response_model=ApiResponse[CsvImportResult])
def import_logs(
    file: UploadFile = File(...),
    dry_run: bool = Query(False),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    try:
        return {"data": svc.import_logs(db, _read(file), dry_run, admin.id)}
    except TableFormatError as e:
        raise HTTPException(400, str(e))


@router.post("/attachments", response_model=ApiResponse[CsvImportResult])
def import_attachments(
    file: UploadFile = File(...),
    dry_run: bool = Query(False),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    try:
        return {"data": svc.import_attachments(db, _read(file), dry_run)}
    except TableFormatError as e:
        raise HTTPException(400, str(e))
