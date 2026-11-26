"""PR 배치 관리 Pydantic 스키마."""
from datetime import date, datetime
from pydantic import BaseModel, Field


class PrBatchItemCreate(BaseModel):
    item_kind: str = Field("개별 PR", max_length=30)
    kac_pr_no: str | None = Field(None, max_length=20)
    lm_pr_no: str | None = Field(None, max_length=50)
    title: str = Field(min_length=1, max_length=500)
    agreed_content: str | None = None
    actual_fix: str | None = None
    verify_method: str | None = None
    item_status: str = Field("대기", max_length=20)
    sort_order: int = 0
    issue_id: int | None = None


class PrBatchItemUpdate(BaseModel):
    item_kind: str | None = Field(None, max_length=30)
    kac_pr_no: str | None = Field(None, max_length=20)
    lm_pr_no: str | None = Field(None, max_length=50)
    title: str | None = Field(None, min_length=1, max_length=500)
    agreed_content: str | None = None
    actual_fix: str | None = None
    verify_method: str | None = None
    item_status: str | None = Field(None, max_length=20)
    sort_order: int | None = None


class PrBatchItemsBulkCreate(BaseModel):
    items: list[PrBatchItemCreate]


class PrVerificationSave(BaseModel):
    result: str = "미판정"
    skyline_version: str | None = None
    adaptation_version: str | None = None
    test_segment: str | None = None
    attendees: str | None = None
    tested_on: date | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    verify_method: str | None = None
    result_summary: str | None = None
    notes: str | None = None


class PrVerificationResultUpdate(BaseModel):
    result: str


class PrBatchCreate(BaseModel):
    batch_no: str | None = Field(None, max_length=20)  # 비우면 수정일자 기준 자동 부여
    sw_version: str = Field(min_length=1, max_length=50)
    previous_version: str | None = Field(None, max_length=50)
    # 검증 보고서 기본값
    skyline_version: str | None = Field(None, max_length=100)
    adaptation_version: str | None = Field(None, max_length=100)
    test_segment: str | None = Field(None, max_length=100)
    agreed_date: date  # 화면 표기: 수정일자
    target_date: date | None = None
    delivery_date: date | None = None
    verified_date: date | None = None
    status: str = Field("검증중", max_length=20)  # 단계 관리는 쓰지 않음 (컬럼 호환용)
    summary: str | None = None
    notes: str | None = None


class PrBatchUpdate(BaseModel):
    sw_version: str | None = Field(None, min_length=1, max_length=50)
    previous_version: str | None = Field(None, max_length=50)
    skyline_version: str | None = Field(None, max_length=100)
    adaptation_version: str | None = Field(None, max_length=100)
    test_segment: str | None = Field(None, max_length=100)
    agreed_date: date | None = None
    target_date: date | None = None
    delivery_date: date | None = None
    verified_date: date | None = None
    status: str | None = Field(None, max_length=20)
    summary: str | None = None
    notes: str | None = None
