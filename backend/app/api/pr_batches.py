"""PR 배치 관리 API."""
import io
import mimetypes
from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.pr_batch import (
    PrBatchCreate, PrBatchItemCreate, PrBatchItemsBulkCreate, PrBatchItemUpdate, PrBatchUpdate,
    PrVerificationResultUpdate, PrVerificationSave,
)
from app.services import pr_batch_list_service as list_svc
from app.services import pr_batch_write_service as write_svc
from app.services import pr_verification_service as verification_svc
from app.services import pr_workbook_import_service as import_svc

router = APIRouter(prefix="/api/pr-batches", tags=["pr-batches"])

_BATCH_NOT_FOUND = "배치를 찾을 수 없습니다"
_ITEM_NOT_FOUND = "항목을 찾을 수 없습니다"
_DOC_TYPES = {"기준 엑셀", "PR목록", "제작사 절차서", "테스트절차", "수정문서", "합의서", "납품문서", "검증결과", "기타"}


def _disposition(name: str, download: bool) -> dict:
    return {"Content-Disposition": f"{'attachment' if download else 'inline'}; filename*=UTF-8''{quote(name, safe='')}"}


# 브라우저에서 바로 열어도 안전한 형식만 inline 으로 보여 준다 (html·svg 등은 같은 주소에서 스크립트가 실행될 수 있어 항상 내려받기)
_INLINE_SAFE = {"application/pdf", "image/png", "image/jpeg", "image/gif", "image/webp", "text/plain"}


@router.get("", response_model=ApiResponse[dict])
def list_batches(
    status: str | None = Query(None),
    year: int | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    query: str | None = Query(None, max_length=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    items, total = list_svc.list_batches(db, status, year, skip, limit, query)
    return ApiResponse.ok(data={"items": items, "total": total})


@router.get("/lookup", response_model=ApiResponse[dict])
def lookup_batch_item(
    issue_id: int | None = Query(None, ge=1),
    kac_pr_no: str | None = Query(None, max_length=20),
    lm_pr_no: str | None = Query(None, max_length=50),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = list_svc.find_batch_item(db, issue_id, kac_pr_no, lm_pr_no)
    if result is None:
        raise HTTPException(status_code=404, detail="연결된 버전 검증 항목을 찾을 수 없습니다")
    return ApiResponse.ok(data=result)


@router.post("", response_model=ApiResponse[dict], status_code=201)
def create_batch(
    body: PrBatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        batch_id = write_svc.create_batch(db, current_user.id, body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return ApiResponse.ok(data=list_svc.get_batch(db, batch_id))


@router.get("/attachments/{att_id}/download")
def download_attachment(
    att_id: int,
    download: bool = Query(False),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = write_svc.get_attachment_path(db, att_id)
    if not result:
        raise HTTPException(status_code=404, detail="첨부파일을 찾을 수 없습니다")
    path, original_name = result
    if not Path(path).is_file():  # 서버에서 파일이 사라진 경우 (수동 정리·백업 복원 불일치)
        raise HTTPException(status_code=404, detail="파일이 서버에 없습니다. 다시 올려 주세요")
    mime_type, _ = mimetypes.guess_type(original_name)
    inline = mime_type in _INLINE_SAFE
    return FileResponse(path, media_type=mime_type or "application/octet-stream",
                        headers={**_disposition(original_name, download or not inline), "X-Content-Type-Options": "nosniff"})


@router.delete("/attachments/{att_id}", response_model=ApiResponse[None])
def delete_attachment(
    att_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if not write_svc.delete_attachment(db, att_id):
        raise HTTPException(status_code=404, detail="첨부파일을 찾을 수 없습니다")
    return ApiResponse.ok(data=None)


@router.delete("/items/{item_id}", response_model=ApiResponse[None])
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        deleted = write_svc.delete_item(db, item_id, current_user)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    if not deleted:
        raise HTTPException(status_code=404, detail=_ITEM_NOT_FOUND)
    return ApiResponse.ok(data=None)


@router.patch("/items/{item_id}", response_model=ApiResponse[None])
def update_item(
    item_id: int,
    body: PrBatchItemUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if not write_svc.update_item(db, item_id, body):
        raise HTTPException(status_code=404, detail=_ITEM_NOT_FOUND)
    return ApiResponse.ok(data=None)


@router.post("/items/{item_id}/verifications", response_model=ApiResponse[dict])
def save_verification(
    item_id: int,
    body: PrVerificationSave,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    values = body.model_dump(exclude={"result"})
    try:
        verification_id = verification_svc.save_verification(db, item_id, current_user, values, body.result)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return ApiResponse.ok(data={"id": verification_id}, message="검증 결과를 저장했습니다")


@router.get("/verifications/{verification_id}", response_model=ApiResponse[dict])
def get_verification(
    verification_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = verification_svc.get_verification(db, verification_id)
    if result is None:
        raise HTTPException(status_code=404, detail="검증 기록을 찾을 수 없습니다")
    return ApiResponse.ok(data=result)


@router.patch("/verifications/{verification_id}/result", response_model=ApiResponse[None])
def update_verification_result(
    verification_id: int,
    body: PrVerificationResultUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        verification_svc.set_result(db, verification_id, current_user, body.result)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return ApiResponse.ok(data=None)


@router.delete("/verifications/{verification_id}", response_model=ApiResponse[None])
def delete_verification(
    verification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        verification_svc.delete_verification(db, verification_id, current_user)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    return ApiResponse.ok(data=None, message="검증 기록을 삭제했습니다")


@router.get("/verifications/{verification_id}/report")
def download_verification_report(
    verification_id: int,
    download: bool = Query(False),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = verification_svc.get_report_path(db, verification_id)
    if result is None or not result[0].is_file():
        raise HTTPException(status_code=404, detail="검증 보고서를 찾을 수 없습니다")
    path, original_name = result
    return FileResponse(path, media_type="application/pdf", headers=_disposition(original_name, download))


@router.post("/{batch_id}/imports/workbook", response_model=ApiResponse[dict])
async def import_worker_workbook(
    batch_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = await import_svc.import_worker_workbook(db, batch_id, current_user, file)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    message = f"엑셀 검증자료 {result['imported_items']}건을 반영했습니다"
    if result["skipped_sheets"]:
        message += f". 배치에 없는 PR이라 건너뛴 시트: {', '.join(result['skipped_sheets'])}"
    if result["duplicate_sheets"]:
        message += f". 같은 PR이 중복된 시트(뒤 시트로 저장): {', '.join(result['duplicate_sheets'])}"
    return ApiResponse.ok(data=result, message=message)


@router.post("/{batch_id}/imports/catalog", response_model=ApiResponse[dict])
async def import_catalog_workbook(
    batch_id: int,
    dry_run: bool = Query(False, description="true 면 저장하지 않고 새로 등록될 개별 PR 만 알려 준다"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.size is not None and file.size > write_svc.MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="기준 엑셀은 20MB 이하만 등록할 수 있습니다")
    attachment = None
    issue_ids: list[int] = []
    try:
        result = await import_svc.import_catalog(db, batch_id, file, current_user, dry_run)
        if not dry_run:
            await file.seek(0)
            attachment = await write_svc.upload_attachment(
                db, batch_id, current_user.id, file, "기준 엑셀", commit=False,
            )
            issue_ids = result.pop("_created_issue_ids", [])
            db.commit()
            result["attachment_id"] = attachment["id"]
    except ValueError as exc:
        db.rollback()
        write_svc.remove_stored_attachment(attachment["stored_name"] if attachment else None)
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        db.rollback()
        write_svc.remove_stored_attachment(attachment["stored_name"] if attachment else None)
        raise
    if not dry_run:
        import_svc.finalize_catalog_import(issue_ids)
    return ApiResponse.ok(data=result)


@router.get("/{batch_id}/workbooks/{user_id}")
def download_worker_workbook(
    batch_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = import_svc.get_workbook_path(db, batch_id, user_id)
    if result is None or not result[0].is_file():
        raise HTTPException(status_code=404, detail="업로드된 엑셀을 찾을 수 없습니다")
    return FileResponse(result[0], filename=result[1])


@router.get("/{batch_id}/template")
def download_template(
    batch_id: int,
    item_ids: str | None = Query(None, description="쉼표로 구분한 PR 항목 ID"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    ids = [int(x) for x in item_ids.split(",") if x.strip().isdigit()] if item_ids else None
    from app.services import pr_template_export_service as tpl_svc
    try:
        content, filename = tpl_svc.build_template_workbook(db, batch_id, ids)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=_disposition(filename, True),
    )


@router.get("/{batch_id}/export")
def export_verification_reports(
    batch_id: int,
    user_id: int | None = Query(None),
    item_ids: str | None = Query(None, description="쉼표로 구분한 PR 항목 ID"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    ids = [int(x) for x in item_ids.split(",") if x.strip().isdigit()] if item_ids else None
    try:
        stream, filename, count = verification_svc.merge_reports(db, batch_id, user_id, ids)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return StreamingResponse(stream, media_type="application/pdf",
                             headers={**_disposition(filename, True), "X-Report-Count": str(count)})


@router.get("/{batch_id}", response_model=ApiResponse[dict])
def get_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = list_svc.get_batch(db, batch_id)
    if not result:
        raise HTTPException(status_code=404, detail=_BATCH_NOT_FOUND)
    return ApiResponse.ok(data=result)


@router.patch("/{batch_id}", response_model=ApiResponse[dict])
def update_batch(
    batch_id: int,
    body: PrBatchUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    if not write_svc.update_batch(db, batch_id, body):
        raise HTTPException(status_code=404, detail=_BATCH_NOT_FOUND)
    return ApiResponse.ok(data=list_svc.get_batch(db, batch_id))


@router.delete("/{batch_id}", response_model=ApiResponse[None])
def delete_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not write_svc.delete_batch(db, batch_id, current_user.id):
        raise HTTPException(status_code=404, detail=_BATCH_NOT_FOUND)
    return ApiResponse.ok(data=None)


@router.post("/{batch_id}/items", response_model=ApiResponse[dict], status_code=201)
def add_item(
    batch_id: int,
    body: PrBatchItemCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = write_svc.add_item(db, batch_id, body)
    if not result:
        raise HTTPException(status_code=404, detail=_BATCH_NOT_FOUND)
    return ApiResponse.ok(data=result)


@router.post("/{batch_id}/items/bulk", response_model=ApiResponse[dict], status_code=201)
def add_items_bulk(
    batch_id: int,
    body: PrBatchItemsBulkCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        count = write_svc.add_items_bulk(db, batch_id, body.items)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return ApiResponse.ok(data={"created": count}, message=f"PR {count}건을 등록했습니다")


@router.post("/{batch_id}/attachments", response_model=ApiResponse[dict], status_code=201)
async def upload_attachment(
    batch_id: int,
    doc_type: str = Query("기타"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if doc_type not in _DOC_TYPES:
        raise HTTPException(status_code=400, detail="지원하지 않는 문서 종류입니다")
    if doc_type == "기준 엑셀":  # 기준 엑셀은 PR 등록 탭 [기준 엑셀 등록]으로만 올린다 (PR 목록도 함께 반영).
        raise HTTPException(status_code=400, detail="기준 엑셀은 PR 등록 탭에서 등록해 주세요")
    try:
        result = await write_svc.upload_attachment(db, batch_id, current_user.id, file, doc_type)
        return ApiResponse.ok(data=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
