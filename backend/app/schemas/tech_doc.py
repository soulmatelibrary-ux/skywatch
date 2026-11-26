"""기록문서 모듈 Pydantic 스키마."""
from datetime import date, datetime
from pydantic import BaseModel


class CategoryResponse(BaseModel):
    id: int
    project_code: str
    category_code: str
    name: str
    sort_order: int
    is_active: bool

    class Config:
        from_attributes = True


class CategoryCreate(BaseModel):
    project_code: str
    category_code: str
    name: str
    sort_order: int = 0


class CategoryUpdate(BaseModel):
    name: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class CategoryTree(BaseModel):
    project_code: str
    categories: list[CategoryResponse]


class AttachmentResponse(BaseModel):
    id: int
    original_name: str
    stored_name: str
    file_extension: str | None
    reg_date: date | None
    created_at: datetime

    class Config:
        from_attributes = True


class TechDocListItem(BaseModel):
    id: int
    record_date: date | None
    project_code: str | None
    category_code: str | None
    author_name: str | None = None
    title: str | None
    doc_type: str | None
    adapt_version: str | None
    attachment_count: int = 0

    class Config:
        from_attributes = True


class TechDocDetail(BaseModel):
    id: int
    legacy_seq: int | None
    record_date: date | None
    project_code: str | None
    category_code: str | None
    author_id: int | None = None
    author_name: str | None = None
    last_edited_by_name: str | None = None
    title: str | None
    content: str | None
    summary: str | None
    detail_summary: str | None
    doc_type: str | None
    adapt_version: str | None
    service_date: date | None
    reference: str | None
    orig_user_id: str | None
    created_at: datetime
    updated_at: datetime
    attachments: list[AttachmentResponse] = []

    class Config:
        from_attributes = True


class TechDocCreate(BaseModel):
    record_date: date | None = None
    project_code: str | None = None
    category_code: str | None = None
    title: str
    content: str | None = None
    summary: str | None = None
    detail_summary: str | None = None
    doc_type: str | None = None
    adapt_version: str | None = None
    service_date: date | None = None
    reference: str | None = None


class TechDocUpdate(BaseModel):
    record_date: date | None = None
    project_code: str | None = None
    category_code: str | None = None
    title: str | None = None
    content: str | None = None
    summary: str | None = None
    detail_summary: str | None = None
    doc_type: str | None = None
    adapt_version: str | None = None
    service_date: date | None = None
    reference: str | None = None


class TechDocListResponse(BaseModel):
    items: list[TechDocListItem]
    total: int
    page: int
    page_size: int


class BulkCategoryUpdate(BaseModel):
    ids: list[int]
    project_code: str | None = None
    category_code: str | None = None

    model_config = {"json_schema_extra": {"examples": [{"ids": [1, 2], "project_code": "SKYLINE", "category_code": "C01"}]}}

    def model_post_init(self, __context):
        if not self.ids:
            raise ValueError("ids는 1개 이상이어야 합니다")
