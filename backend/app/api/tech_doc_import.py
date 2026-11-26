"""관제시스템 문서 CSV 가져오기 API (로그인한 사용자 누구나).

`/api/tech-docs/{doc_id}/attachments` 와 경로가 겹치지 않게 접두어를 따로 둔다.
"""
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.csv_import import CsvImportResult
from app.services import tech_doc_csv_import as svc
from app.services.tech_doc_csv_parse import MAX_CSV_SIZE, CsvFormatError

router = APIRouter(prefix="/api/tech-docs-import", tags=["tech-docs"])


def _read(file: UploadFile) -> bytes:
    # 엔드포인트를 일반 def 로 두어 작업 스레드에서 실행 — 가져오는 동안 서버 전체가 멈추지 않게
    raw = file.file.read(MAX_CSV_SIZE + 1)
    if not raw:
        raise HTTPException(400, "빈 파일입니다.")
    return raw


@router.post("/docs", response_model=ApiResponse[CsvImportResult])
def import_docs(
    file: UploadFile = File(...),
    dry_run: bool = Query(False),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        return {"data": svc.import_docs(db, _read(file), dry_run)}
    except CsvFormatError as e:
        raise HTTPException(400, str(e))


@router.post("/attachments", response_model=ApiResponse[CsvImportResult])
def import_attachments(
    file: UploadFile = File(...),
    dry_run: bool = Query(False),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        return {"data": svc.import_attachments(db, _read(file), dry_run)}
    except CsvFormatError as e:
        raise HTTPException(400, str(e))
