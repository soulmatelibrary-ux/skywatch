from __future__ import annotations

"""Technology document API."""

import mimetypes
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.tech_doc import TechDoc
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.tech_doc import (
    AttachmentResponse,
    BulkCategoryUpdate,
    CategoryCreate,
    CategoryResponse,
    CategoryTree,
    CategoryUpdate,
    TechDocCreate,
    TechDocDetail,
    TechDocListResponse,
    TechDocUpdate,
)
from app.services import tech_doc_list_service as list_svc
from app.services import tech_doc_write_service as write_svc
from app.services.tech_doc_vector_service import schedule_vectorize_tech_doc

router = APIRouter(prefix="/api/tech-docs", tags=["tech-docs"])


@router.get("/categories", response_model=ApiResponse[list[CategoryTree]])
def get_categories(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return {"data": list_svc.get_categories(db)}


@router.get("/categories/manage", response_model=ApiResponse[list[CategoryResponse]])
def get_categories_manage(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return {"data": list_svc.get_categories_for_manage(db)}


@router.post("/categories", response_model=ApiResponse[CategoryResponse])
def create_category(data: CategoryCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    cat = write_svc.create_category(db, data)
    return {"data": CategoryResponse.model_validate(cat)}


@router.put("/categories/{category_id}", response_model=ApiResponse[CategoryResponse])
def update_category(category_id: int, data: CategoryUpdate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    cat = write_svc.update_category(db, category_id, data)
    if not cat:
        raise HTTPException(404, "카테고리를 찾을 수 없습니다.")
    return {"data": CategoryResponse.model_validate(cat)}


@router.delete("/categories/{category_id}", response_model=ApiResponse[bool])
def delete_category(category_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if not write_svc.delete_category(db, category_id):
        raise HTTPException(404, "카테고리를 찾을 수 없습니다.")
    return {"data": True}


@router.get("/attachments/{att_id}/download")
def download_attachment(
    att_id: int,
    download: bool = Query(False),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = write_svc.get_attachment_path(db, att_id)
    if not result:
        raise HTTPException(404, "첨부파일을 찾을 수 없습니다.")
    path, original_name = result
    write_svc.ensure_attachment_mirror(db, att_id)
    encoded = quote(original_name, safe="")
    disposition = "attachment" if download else "inline"
    mime_type, _ = mimetypes.guess_type(original_name)
    return FileResponse(
        path,
        filename=original_name,
        media_type=mime_type or "application/octet-stream",
        headers={"Content-Disposition": f"{disposition}; filename*=UTF-8''{encoded}"},
    )


@router.delete("/attachments/{att_id}", response_model=ApiResponse[bool])
def delete_attachment(att_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    if not write_svc.delete_attachment(db, att_id):
        raise HTTPException(404, "첨부파일을 찾을 수 없습니다.")
    return {"data": True}


@router.get("", response_model=ApiResponse[TechDocListResponse])
def list_tech_docs(
    project_code: str | None = Query(None),
    category_code: str | None = Query(None),
    doc_type: str | None = Query(None),
    q: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    semantic: bool = Query(False),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from datetime import date as date_type

    def _parse_date(s: str | None):
        if not s:
            return None
        try:
            return date_type.fromisoformat(s)
        except Exception:
            return None

    result = list_svc.get_tech_docs(
        db,
        project_code=project_code,
        category_code=category_code,
        doc_type=doc_type,
        q=q,
        date_from=_parse_date(date_from),
        date_to=_parse_date(date_to),
        page=page,
        page_size=page_size,
        semantic=semantic,
    )
    return {"data": result}


@router.get("/{doc_id}", response_model=ApiResponse[TechDocDetail])
def get_tech_doc(doc_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    doc = list_svc.get_tech_doc_detail(db, doc_id)
    if not doc:
        raise HTTPException(404, "문서를 찾을 수 없습니다.")
    return {"data": doc}


@router.patch("/bulk-category", response_model=ApiResponse[int])
def bulk_update_category(data: BulkCategoryUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    count = write_svc.bulk_update_category(db, data.ids, data.project_code, data.category_code, user.id)
    return {"data": count}


@router.post("", response_model=ApiResponse[TechDocDetail])
def create_tech_doc(data: TechDocCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    doc = write_svc.create_tech_doc(db, data, user.id)
    schedule_vectorize_tech_doc(doc.id)
    return {"data": list_svc.get_tech_doc_detail(db, doc.id)}


@router.put("/{doc_id}", response_model=ApiResponse[TechDocDetail])
def update_tech_doc(doc_id: int, data: TechDocUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    doc = write_svc.update_tech_doc(db, doc_id, data, user.id)
    if not doc:
        raise HTTPException(404, "문서를 찾을 수 없습니다.")
    schedule_vectorize_tech_doc(doc.id)
    return {"data": list_svc.get_tech_doc_detail(db, doc.id)}


@router.delete("/{doc_id}", response_model=ApiResponse[bool])
def delete_tech_doc(doc_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    doc = db.get(TechDoc, doc_id)
    if not doc or doc.is_deleted:
        raise HTTPException(404, "문서를 찾을 수 없습니다.")
    if doc.author_id != user.id and getattr(user, "role", None) != "admin":
        raise HTTPException(403, "작성자만 삭제할 수 있습니다.")
    if not write_svc.delete_tech_doc(db, doc_id):
        raise HTTPException(404, "문서를 찾을 수 없습니다.")
    return {"data": True}


@router.post("/{doc_id}/attachments", response_model=ApiResponse[AttachmentResponse])
def upload_attachment(
    doc_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    att = write_svc.save_attachment(db, doc_id, file, user.id)
    schedule_vectorize_tech_doc(doc_id)
    return {"data": AttachmentResponse.model_validate(att)}
