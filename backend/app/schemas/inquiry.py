# 문의사항 관리대장 Pydantic 스키마
from datetime import date, datetime
from pydantic import BaseModel


class InquiryCreate(BaseModel):
    occurred_date: date
    occurred_time: str | None = None
    controller_sector: str | None = None
    sw_version: str | None = None
    received_by: int | None = None
    category: str | None = None
    keyword: str | None = None
    content: str | None = None
    status: str = "in_progress"
    completed_date: date | None = None
    pr_no: str | None = None
    note: str | None = None
    card_id: int | None = None


class InquiryUpdate(BaseModel):
    occurred_date: date | None = None
    occurred_time: str | None = None
    controller_sector: str | None = None
    sw_version: str | None = None
    received_by: int | None = None
    category: str | None = None
    keyword: str | None = None
    content: str | None = None
    status: str | None = None
    completed_date: date | None = None
    pr_no: str | None = None
    note: str | None = None


class InquiryResponse(BaseModel):
    id: int
    inquiry_no: str
    occurred_date: date
    occurred_time: str | None
    controller_sector: str | None
    sw_version: str | None
    received_by: int | None
    received_by_name: str | None
    received_by_raw: str | None
    category: str | None
    keyword: str | None
    content: str | None
    status: str
    completed_date: date | None
    pr_no: str | None
    note: str | None
    card_id: int | None
    created_by: int | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
