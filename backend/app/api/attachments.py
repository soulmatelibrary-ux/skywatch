from __future__ import annotations

"""Attachment API - upload/list/search/download/delete."""

from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.config import settings
from app.models.user import User
from app.schemas.attachment import AttachmentOut, AttachmentSearchResult
from app.schemas.common import ApiResponse
from app.services import attachment_service
from app.services.file_mirror import mirror_file

router = APIRouter(prefix="/api/attachments", tags=["attachments"])

MAX_SIZE = 1 * 1024 * 1024 * 1024  # 1 GB


@router.post("", response_model=AttachmentOut, status_code=201)
async def upload_attachment(
    owner_type: str = Query(...),
    owner_id: int = Query(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if owner_type not in ("card", "task", "comment"):
        raise HTTPException(400, "owner_type must be card|task|comment")
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(413, "파일 크기가 1GB를 초과했습니다.")
    return await attachment_service.upload_file(
        db,
        owner_type,
        owner_id,
        file.filename or "upload",
        content,
        file.content_type,
        current_user.id,
        settings.UPLOAD_DIR,
    )


@router.get("", response_model=list[AttachmentOut])
def list_attachments(
    owner_type: str = Query(...),
    owner_id: int = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return attachment_service.list_attachments(db, owner_type, owner_id)


@router.get("/search", response_model=ApiResponse[list[AttachmentSearchResult]])
def search_attachments(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    results = attachment_service.search_by_name(db, q)
    return ApiResponse.ok(data=results)


@router.get("/{att_id}/download")
def download_attachment(
    att_id: int,
    download: bool = Query(False),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    att = attachment_service.get_attachment(db, att_id)
    if not att:
        raise HTTPException(404, "첨부파일을 찾을 수 없습니다.")

    path = attachment_service.get_download_path(att)
    if not path:
        raise HTTPException(404, "첨부파일을 찾을 수 없습니다.")

    try:
        mirror_file(path, att.file_name)
    except Exception as e:
        print(f"[WARN] mirror_file skipped: {e}")

    encoded = quote(att.original_name, safe="")
    raw_name = Path(att.file_name).name
    # HTTP 헤더 filename= 파라미터는 ASCII만 허용 (RFC 6266)
    # 레거시 파일의 file_name에 한글이 포함된 경우 확장자만 사용하고
    # 실제 한글 파일명은 filename*=UTF-8''... 파라미터로만 전달
    try:
        raw_name.encode("ascii")
        ascii_name = raw_name
    except UnicodeEncodeError:
        ext = Path(att.original_name or att.file_name or "").suffix or ".bin"
        ascii_name = f"download{ext}"

    disposition = "attachment" if download else "inline"
    headers: dict[str, str] = {
        "Content-Disposition": (
            f'{disposition}; filename="{ascii_name}"; filename*=UTF-8\'\'{encoded}'
        )
    }

    return FileResponse(
        path,
        media_type=att.mime_type or "application/octet-stream",
        headers=headers,
    )


@router.delete("/{att_id}", status_code=204)
def delete_attachment(
    att_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    ok = attachment_service.delete_attachment(db, att_id, settings.UPLOAD_DIR)
    if not ok:
        raise HTTPException(404, "첨부파일을 찾을 수 없습니다.")
