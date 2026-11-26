# SkyNet 연동 Pydantic 스키마 — crawl_* 테이블 응답 타입
from pydantic import BaseModel
from typing import Optional, List, Any


class DocumentOut(BaseModel):
    id: int
    dept_name: Optional[str] = None
    doc_type: Optional[str] = None
    title: Optional[str] = None
    reg_date: Optional[str] = None
    reg_number: Optional[str] = None
    doc_number: Optional[str] = None
    detail_url: Optional[str] = None
    crawled_at: Optional[str] = None
    charger_nm: Optional[str] = None
    matched_keyword: Optional[str] = None
    memo: Optional[str] = None


class DocumentsResponse(BaseModel):
    items: List[DocumentOut]
    total: int
    page: int
    size: int


class BoardPostOut(BaseModel):
    id: int
    atcl_id: str
    brd_name: Optional[str] = None
    title: Optional[str] = None
    body_text: Optional[str] = None
    reg_dt: Optional[str] = None
    author: Optional[str] = None
    view_cnt: Optional[int] = 0
    matched_keyword: Optional[str] = None


class BoardResponse(BaseModel):
    items: List[BoardPostOut]
    total: int
    page: int
    size: int


class DashboardStats(BaseModel):
    doc_total: int
    doc_today: int
    board_total: int
    board_today: int
    crawl_status: str
    last_crawled_at: Optional[str] = None


class CrawlStatusOut(BaseModel):
    status: str
    message: Optional[str] = None
    data: Optional[Any] = None
