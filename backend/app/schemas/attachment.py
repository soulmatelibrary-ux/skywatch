from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel


class AttachmentSearchResult(BaseModel):
    attachment_id: int
    original_name: str
    file_size: int
    file_name: str
    card_id: int
    card_title: str | None = None
    log_id: int
    log_date: str | None = None


class AttachmentOut(BaseModel):
    id: int
    owner_type: str
    owner_id: int
    original_name: str
    file_name: str
    file_path: str
    file_size: int
    mime_type: str | None = None
    uploaded_by: int
    created_at: datetime

    model_config = {"from_attributes": True}
