from __future__ import annotations

import os
import uuid
from pathlib import Path
from typing import Any

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.issue import Issue
from app.models.log import Log, LogCard
from app.models.schedule import Attachment
from app.services.file_mirror import DOWNLOAD_MIRROR_ROOT, mirror_bytes, mirror_file


MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
BACKEND_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = Path(__file__).resolve().parents[4]


def _resolve_upload_root() -> Path:
    configured = Path(settings.UPLOAD_DIR)
    if configured.is_absolute():
        return configured
    return (BACKEND_ROOT / configured).resolve()


UPLOAD_ROOT = _resolve_upload_root()
UPLOAD_DIR = str(UPLOAD_ROOT)
ISSUE_UPLOAD_DIR = str(UPLOAD_ROOT / "issues")


def _ensure_dir() -> None:
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)


def _ensure_issue_dir() -> None:
    Path(ISSUE_UPLOAD_DIR).mkdir(parents=True, exist_ok=True)


async def upload_file(
    db: Session,
    owner_type: str,
    owner_id: int,
    original_name: str,
    content: bytes,
    mime_type: str | None,
    user_id: int,
    upload_dir: str,
) -> Attachment:
    if owner_type not in ("card", "task", "comment"):
        raise ValueError("unsupported owner_type")

    if len(content) > MAX_FILE_SIZE:
        raise ValueError("파일 크기가 20MB를 초과할 수 없습니다.")

    if owner_type == "card":
        card = db.query(LogCard).filter(
            LogCard.id == owner_id,
            LogCard.is_deleted.is_(False),
        ).first()
        if not card:
            raise ValueError("존재하지 않는 카드입니다.")
    elif owner_type == "task":
        # task/comment 업로드는 별도 검증이 필요하면 여기에 추가
        pass

    _ensure_dir()
    ext = os.path.splitext(original_name or "")[1]
    stored = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(upload_dir, stored)

    with open(path, "wb") as f:
        f.write(content)

    mirror_bytes(content, stored)

    att = Attachment(
        owner_type=owner_type,
        owner_id=owner_id,
        original_name=original_name or stored,
        file_path=path,
        file_name=stored,
        file_size=len(content),
        mime_type=mime_type,
        uploaded_by=user_id,
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    return att


async def upload(db: Session, card_id: int, user_id: int, file: UploadFile) -> Attachment:
    card = db.query(LogCard).filter(
        LogCard.id == card_id, LogCard.is_deleted.is_(False)
    ).first()
    if not card:
        raise ValueError("존재하지 않는 카드입니다.")

    _ensure_dir()
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise ValueError("파일 크기가 20MB를 초과할 수 없습니다.")

    ext = os.path.splitext(file.filename or "")[1]
    stored = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, stored)

    with open(path, "wb") as f:
        f.write(content)

    mirror_bytes(content, stored)

    att = Attachment(
        owner_type="card",
        owner_id=card_id,
        original_name=file.filename or stored,
        file_path=path,
        file_name=stored,
        file_size=len(content),
        mime_type=file.content_type,
        uploaded_by=user_id,
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    return att


async def upload_for_issue(db: Session, issue_id: int, user_id: int, file: UploadFile) -> Attachment:
    issue = db.query(Issue).filter(Issue.id == issue_id, Issue.is_deleted.is_(False)).first()
    if not issue:
        raise ValueError("존재하지 않는 이슈입니다.")

    _ensure_issue_dir()
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise ValueError("파일 크기가 20MB를 초과할 수 없습니다.")

    ext = os.path.splitext(file.filename or "")[1]
    stored = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(ISSUE_UPLOAD_DIR, stored)

    with open(path, "wb") as f:
        f.write(content)

    mirror_bytes(content, os.path.join("issues", stored))

    att = Attachment(
        owner_type="issue",
        owner_id=issue_id,
        original_name=file.filename or stored,
        file_path=path,
        file_name=f"issues/{stored}",
        file_size=len(content),
        mime_type=file.content_type,
        uploaded_by=user_id,
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    return att


def get_attachment(db: Session, attachment_id: int) -> Attachment | None:
    return (
        db.query(Attachment)
        .filter(Attachment.id == attachment_id, Attachment.is_deleted.is_(False))
        .first()
    )


_BLOCKED_DIRS = {"node_modules", "models", "__pycache__", "site-packages"}


def _is_servable(p: Path) -> bool:
    """첨부로 내려줘도 되는 파일인지: 숨김 파일·폴더(.env, .venv, .git)와 환경 폴더 안은 제외."""
    parts = p.resolve().parts
    return not any(part.startswith(".") or part in _BLOCKED_DIRS for part in parts[1:])


def _existing_attachment_path(att: Attachment) -> str | None:
    """
    Resolve an attachment file from several likely locations.

    Prefer the stored file name first because many legacy rows keep a
    transformed display name in file_path while the actual on-disk file sits
    directly under uploads/. Fall back to the DB path and then basename search.
    """
    # original_name 은 업로드한 사람이 정하는 값이라 경로로 쓰지 않고 파일 이름만 쓴다
    raw_values = [att.file_name, att.file_path, Path(att.original_name).name if att.original_name else None]
    candidates: list[Path] = []
    upload_roots = [UPLOAD_ROOT, UPLOAD_ROOT.parent]

    for value in raw_values:
        if not value:
            continue
        p = Path(value)
        if p.is_absolute():
            candidates.append(p)
        else:
            candidates.extend([
                p,
                Path.cwd() / p,
                upload_roots[0] / p,
                upload_roots[1] / p,
            ])

            parts = p.parts
            if parts and parts[0] in {"uploads", "download"} and len(parts) > 1:
                tail = Path(*parts[1:])
                candidates.extend([
                    upload_roots[0] / tail,
                    upload_roots[1] / tail,
                    upload_roots[0] / tail.name,
                    upload_roots[1] / tail.name,
                ])

    seen: set[str] = set()
    for candidate in candidates:
        key = str(candidate)
        if key in seen:
            continue
        seen.add(key)
        try:
            if candidate.is_file() and _is_servable(candidate):
                return str(candidate)
        except OSError:
            continue

    basenames: list[str] = []
    prefix_queries: list[tuple[str, str]] = []
    for value in raw_values:
        if value:
            path_value = Path(value)
            name = path_value.name
            if name and name not in basenames:
                basenames.append(name)
            stem = path_value.stem
            suffix = path_value.suffix
            if stem and suffix:
                prefix_queries.append((stem, suffix))

    search_roots = [
        upload_roots[0],
        upload_roots[1],
        BACKEND_ROOT,
        REPO_ROOT,
    ]
    for root in search_roots:
        for needle in basenames:
            try:
                matches = [p for p in root.rglob(needle) if p.is_file() and _is_servable(p)]
            except OSError:
                continue
            if len(matches) == 1:
                return str(matches[0])
            if len(matches) > 1:
                matches.sort(key=lambda p: len(str(p)))
                return str(matches[0])
        for stem, suffix in prefix_queries:
            pattern = f"{stem}*{suffix}"
            try:
                matches = [p for p in root.rglob(pattern) if p.is_file() and _is_servable(p)]
            except OSError:
                continue
            if len(matches) == 1:
                return str(matches[0])
            if len(matches) > 1:
                matches.sort(key=lambda p: len(str(p)))
                return str(matches[0])

    return None


def get_download_path(att: Attachment) -> str | None:
    return _existing_attachment_path(att)


def list_attachments(db: Session, owner_type: str, owner_id: int) -> list[Attachment]:
    return (
        db.query(Attachment)
        .filter(
            Attachment.owner_type == owner_type,
            Attachment.owner_id == owner_id,
            Attachment.is_deleted.is_(False),
        )
        .order_by(Attachment.id)
        .all()
    )


def list_for_card(db: Session, card_id: int) -> list[Attachment]:
    return (
        db.query(Attachment)
        .filter(
            Attachment.owner_type == "card",
            Attachment.owner_id == card_id,
            Attachment.is_deleted.is_(False),
        )
        .order_by(Attachment.id)
        .all()
    )


def search_by_name(db: Session, q: str, limit: int = 50) -> list[dict[str, Any]]:
    rows = (
        db.query(
            Attachment.id.label("attachment_id"),
            Attachment.original_name,
            Attachment.file_size,
            Attachment.file_name,
            LogCard.id.label("card_id"),
            LogCard.title.label("card_title"),
            Log.id.label("log_id"),
            Log.date.label("log_date"),
        )
        .join(LogCard, (Attachment.owner_type == "card") & (Attachment.owner_id == LogCard.id))
        .join(Log, LogCard.log_id == Log.id)
        .filter(
            Attachment.original_name.ilike(f"%{q}%"),
            Attachment.is_deleted.is_(False),
            LogCard.is_deleted.is_(False),
            Log.is_deleted.is_(False),
        )
        .order_by(Log.date.desc(), Attachment.id.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "attachment_id": r.attachment_id,
            "original_name": r.original_name,
            "file_size": r.file_size,
            "file_name": r.file_name,
            "card_id": r.card_id,
            "card_title": r.card_title,
            "log_id": r.log_id,
            "log_date": r.log_date.isoformat() if r.log_date else None,
        }
        for r in rows
    ]


def delete(db: Session, attachment_id: int, user_id: int) -> bool:
    att = db.query(Attachment).filter(
        Attachment.id == attachment_id, Attachment.is_deleted.is_(False)
    ).first()
    if not att:
        return False
    if att.uploaded_by != user_id:
        raise PermissionError("권한이 없습니다.")
    path = _existing_attachment_path(att)
    if path and os.path.exists(path):
        os.remove(path)
    mirror_path = DOWNLOAD_MIRROR_ROOT / Path(att.file_name)
    if mirror_path.exists():
        mirror_path.unlink()
    att.is_deleted = True
    db.commit()
    return True


def delete_attachment(db: Session, attachment_id: int, _upload_dir: str | None = None) -> bool:
    att = get_attachment(db, attachment_id)
    if not att:
        return False
    path = _existing_attachment_path(att)
    if path and os.path.exists(path):
        os.remove(path)
    mirror_path = DOWNLOAD_MIRROR_ROOT / Path(att.file_name)
    if mirror_path.exists():
        mirror_path.unlink()
    att.is_deleted = True
    db.commit()
    return True
