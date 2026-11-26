"""PR 배치 쓰기 서비스 — CRUD."""
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.pr_batch import PrBatch, PrBatchAttachment, PrBatchItem, PrVerification
from app.models.user import User
from app.schemas.pr_batch import PrBatchCreate, PrBatchItemCreate, PrBatchItemUpdate, PrBatchUpdate
from app.services.pr_verification_service import remove_files, report_root

MAX_FILE_SIZE = 20 * 1024 * 1024
_BACKEND_ROOT = Path(__file__).resolve().parents[2]
# NOT NULL 컬럼: 수정 요청에 명시적 null 이 와도 무시한다 (DB 오류 대신)
_BATCH_REQUIRED = {"batch_no", "sw_version", "agreed_date", "status"}
_ITEM_REQUIRED = {"title", "item_kind", "item_status", "sort_order"}


def _changes(body, required: set[str]) -> dict:
    return {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None or k not in required}


def _live_item(db: Session, item_id: int) -> PrBatchItem | None:
    """삭제된 버전에 속한 항목은 없는 것으로 본다."""
    item = db.get(PrBatchItem, item_id)
    batch = db.get(PrBatch, item.batch_id) if item else None
    return item if batch is not None and not batch.is_deleted else None


def _upload_root() -> Path:
    p = Path(settings.UPLOAD_DIR)
    base = p if p.is_absolute() else (_BACKEND_ROOT / p).resolve()
    return base / "pr_batches"


def _next_batch_no(db: Session, day) -> str:
    """화면에서 배치번호를 받지 않으므로 수정일자 기준으로 자동 부여 (삭제된 것도 중복 불가)."""
    prefix = day.strftime("%Y%m%d")
    used = set(db.execute(select(PrBatch.batch_no).where(PrBatch.batch_no.like(f"{prefix}-%"))).scalars())
    n = 1
    while f"{prefix}-{n}" in used:
        n += 1
    return f"{prefix}-{n}"


def create_batch(db: Session, user_id: int, body: PrBatchCreate) -> int:
    data = body.model_dump()
    auto = not (data.get("batch_no") or "").strip()
    for _ in range(3):  # 동시에 같은 날짜로 만들면 자동 번호가 겹칠 수 있어 다시 부여한다
        if auto:
            data["batch_no"] = _next_batch_no(db, body.agreed_date)
        batch = PrBatch(**data, created_by=user_id)
        db.add(batch)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            if not auto:
                raise ValueError("이미 사용 중인 배치번호입니다.")
            continue
        db.refresh(batch)
        return batch.id
    raise ValueError("배치번호를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.")


def update_batch(db: Session, batch_id: int, body: PrBatchUpdate) -> bool:
    batch = db.execute(
        select(PrBatch).where(PrBatch.id == batch_id, PrBatch.is_deleted.is_(False))
    ).scalar_one_or_none()
    if not batch:
        return False
    for k, v in _changes(body, _BATCH_REQUIRED).items():
        setattr(batch, k, v)
    db.commit()
    return True


def delete_batch(db: Session, batch_id: int, user_id: int) -> bool:
    batch = db.execute(
        select(PrBatch).where(PrBatch.id == batch_id, PrBatch.is_deleted.is_(False))
    ).scalar_one_or_none()
    if not batch:
        return False
    batch.is_deleted = True
    batch.deleted_by = user_id
    batch.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return True


def add_item(db: Session, batch_id: int, body: PrBatchItemCreate) -> dict | None:
    exists = db.execute(
        select(PrBatch).where(PrBatch.id == batch_id, PrBatch.is_deleted.is_(False))
    ).scalar_one_or_none()
    if not exists:
        return None
    item = PrBatchItem(batch_id=batch_id, **body.model_dump())
    db.add(item)
    db.flush()
    db.commit()
    db.refresh(item)
    return {
        "id": item.id, "batch_id": item.batch_id, "issue_id": item.issue_id, "item_kind": item.item_kind,
        "kac_pr_no": item.kac_pr_no, "lm_pr_no": item.lm_pr_no, "title": item.title,
        "agreed_content": item.agreed_content, "actual_fix": item.actual_fix,
        "verify_method": item.verify_method, "item_status": item.item_status,
        "sort_order": item.sort_order, "created_at": item.created_at, "updated_at": item.updated_at,
    }


def add_items_bulk(db: Session, batch_id: int, bodies: list[PrBatchItemCreate]) -> int:
    batch = db.scalar(select(PrBatch).where(PrBatch.id == batch_id, PrBatch.is_deleted.is_(False)))
    if batch is None:
        raise ValueError("배치를 찾을 수 없습니다.")
    if not bodies:
        raise ValueError("등록할 PR 항목이 없습니다.")
    for index, body in enumerate(bodies):
        values = body.model_dump()
        if values.get("sort_order", 0) == 0:
            values["sort_order"] = index
        item = PrBatchItem(batch_id=batch_id, **values)
        db.add(item)
        db.flush()
    db.commit()
    return len(bodies)


def update_item(db: Session, item_id: int, body: PrBatchItemUpdate) -> bool:
    item = _live_item(db, item_id)
    if not item:
        return False
    for k, v in _changes(body, _ITEM_REQUIRED).items():
        setattr(item, k, v)
    db.commit()
    return True


def delete_item(db: Session, item_id: int, actor: User) -> bool:
    """PR 항목과 본인의 검증 기록(DB CASCADE)을 지우고 보고서 PDF 파일도 정리한다.
    다른 근무자의 검증 기록이 남아 있으면 지울 수 없다 (관리자 제외) — 남의 검증 결과가 함께 사라지는 것을 막는다."""
    item = _live_item(db, item_id)
    if not item:
        return False
    others = db.scalar(select(func.count(PrVerification.id)).where(
        PrVerification.item_id == item_id, PrVerification.is_deleted.is_(False), PrVerification.user_id != actor.id)) or 0
    if others and actor.role != "admin":
        raise PermissionError(f"다른 근무자의 검증 기록 {others}건이 있어 삭제할 수 없습니다. "
                              "기록을 남긴 근무자가 먼저 지우거나 관리자에게 요청해 주세요.")
    names = db.scalars(select(PrVerification.report_stored_name).where(
        PrVerification.item_id == item_id, PrVerification.report_stored_name.is_not(None))).all()
    db.delete(item)
    db.commit()
    remove_files([report_root() / name for name in names])
    return True


async def upload_attachment(
    db: Session, batch_id: int, user_id: int, file: UploadFile, doc_type: str, *, commit: bool = True,
) -> dict:
    exists = db.execute(
        select(PrBatch).where(PrBatch.id == batch_id, PrBatch.is_deleted.is_(False))
    ).scalar_one_or_none()
    if not exists:
        raise ValueError("배치를 찾을 수 없습니다.")
    content = await file.read()
    if not content:
        raise ValueError("빈 파일은 등록할 수 없습니다.")
    if len(content) > MAX_FILE_SIZE:
        raise ValueError("파일 크기가 20MB를 초과할 수 없습니다.")
    root = _upload_root()
    root.mkdir(parents=True, exist_ok=True)
    # 저장 이름의 확장자는 영문·숫자만 남긴다 (Windows 대체 데이터 스트림 'a.pdf:x'·경로 문자·과도한 길이 방지)
    ext = re.sub(r"[^A-Za-z0-9]", "", os.path.splitext(file.filename or "")[1])[:10].lower()
    stored = f"{uuid.uuid4().hex}.{ext}" if ext else uuid.uuid4().hex
    (root / stored).write_bytes(content)
    att = PrBatchAttachment(
        batch_id=batch_id, doc_type=doc_type,
        original_name=(Path(file.filename or "").name or stored)[:255], stored_name=stored,
        file_size=len(content), uploaded_by=user_id,
    )
    db.add(att)
    try:
        if commit:
            db.commit()
            db.refresh(att)
        else:
            db.flush()
    except Exception:
        db.rollback()
        (root / stored).unlink(missing_ok=True)
        raise
    return {
        "id": att.id, "batch_id": att.batch_id, "doc_type": att.doc_type,
        "original_name": att.original_name, "stored_name": att.stored_name,
        "file_size": att.file_size, "uploaded_by": att.uploaded_by, "uploaded_at": att.uploaded_at,
    }


def get_attachment_path(db: Session, att_id: int) -> tuple[str, str] | None:
    att = db.execute(
        select(PrBatchAttachment).where(PrBatchAttachment.id == att_id, PrBatchAttachment.is_deleted.is_(False))
    ).scalar_one_or_none()
    if not att:
        return None
    return str(_upload_root() / att.stored_name), att.original_name


def delete_attachment(db: Session, att_id: int) -> bool:
    att = db.execute(
        select(PrBatchAttachment).where(PrBatchAttachment.id == att_id, PrBatchAttachment.is_deleted.is_(False))
    ).scalar_one_or_none()
    if not att:
        return False
    path = _upload_root() / att.stored_name
    att.is_deleted = True
    db.commit()
    path.unlink(missing_ok=True)
    return True


def remove_stored_attachment(stored_name: str | None) -> None:
    """DB 커밋 실패 시 이번 요청에서 쓴 첨부 원본만 정리한다."""
    if stored_name:
        (_upload_root() / stored_name).unlink(missing_ok=True)
