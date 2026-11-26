from __future__ import annotations

import os
import shutil
import uuid
from datetime import datetime, timezone

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.models.tech_doc import TechDoc, TechDocAttachment, TechDocCategory
from app.schemas.tech_doc import CategoryCreate, CategoryUpdate, TechDocCreate, TechDocUpdate
from app.services.file_mirror import mirror_file


_UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
_UPLOAD_DIR_LEGACY = os.path.join(_UPLOAD_DIR, "tech_docs")
os.makedirs(_UPLOAD_DIR, exist_ok=True)


def create_category(db: Session, data: CategoryCreate) -> TechDocCategory:
    cat = TechDocCategory(**data.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def update_category(db: Session, category_id: int, data: CategoryUpdate) -> TechDocCategory | None:
    cat = db.get(TechDocCategory, category_id)
    if not cat:
        return None
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(cat, k, v)
    db.commit()
    db.refresh(cat)
    return cat


def delete_category(db: Session, category_id: int) -> bool:
    cat = db.get(TechDocCategory, category_id)
    if not cat:
        return False
    cat.is_active = False
    db.commit()
    return True


def create_tech_doc(db: Session, data: TechDocCreate, current_user_id: int) -> TechDoc:
    doc = TechDoc(**data.model_dump(), author_id=current_user_id, created_by=current_user_id)
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def update_tech_doc(db: Session, doc_id: int, data: TechDocUpdate, current_user_id: int) -> TechDoc | None:
    doc = db.get(TechDoc, doc_id)
    if not doc or doc.is_deleted:
        return None
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(doc, k, v)
    doc.last_edited_by = current_user_id
    doc.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(doc)
    return doc


def delete_tech_doc(db: Session, doc_id: int) -> bool:
    doc = db.get(TechDoc, doc_id)
    if not doc or doc.is_deleted:
        return False
    doc.is_deleted = True
    db.commit()
    return True


def bulk_update_category(
    db: Session, ids: list[int], project_code: str | None, category_code: str | None, current_user_id: int
) -> int:
    from sqlalchemy import update as sa_update

    stmt = (
        sa_update(TechDoc)
        .where(TechDoc.id.in_(ids), TechDoc.is_deleted == False)  # noqa: E712
        .values(
            project_code=project_code,
            category_code=category_code,
            last_edited_by=current_user_id,
            updated_at=datetime.now(timezone.utc),
        )
    )
    result = db.execute(stmt)
    db.commit()
    return result.rowcount


def save_attachment(db: Session, tech_doc_id: int, file: UploadFile, current_user_id: int) -> TechDocAttachment:
    ext = os.path.splitext(file.filename or "")[1].lstrip(".")
    stored_name = f"{uuid.uuid4().hex}.{ext}" if ext else uuid.uuid4().hex
    dest = os.path.join(_UPLOAD_DIR, stored_name)
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)
    mirror_file(dest, stored_name)

    att = TechDocAttachment(
        tech_doc_id=tech_doc_id,
        original_name=file.filename or stored_name,
        stored_name=stored_name,
        file_extension=ext or None,
        uploaded_by=current_user_id,
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    return att


def delete_attachment(db: Session, att_id: int) -> bool:
    att = db.get(TechDocAttachment, att_id)
    if not att or att.is_deleted:
        return False
    att.is_deleted = True
    db.commit()
    return True


def get_attachment_path(db: Session, att_id: int) -> tuple[str, str] | None:
    att = db.get(TechDocAttachment, att_id)
    if not att or att.is_deleted:
        return None

    path = os.path.join(_UPLOAD_DIR, att.stored_name)
    if not os.path.isfile(path):
        path = os.path.join(_UPLOAD_DIR_LEGACY, att.stored_name)
    if not os.path.isfile(path):
        return None
    return path, att.original_name


def ensure_attachment_mirror(db: Session, att_id: int) -> str | None:
    result = get_attachment_path(db, att_id)
    if not result:
        return None
    path, _ = result
    att = db.get(TechDocAttachment, att_id)
    if not att:
        return None
    mirror_file(path, att.stored_name)
    return path
