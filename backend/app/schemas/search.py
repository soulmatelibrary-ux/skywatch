"""통합 검색 스키마."""
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


SearchSource = Literal["skywatch"]
SearchTarget = Literal["log", "card", "comment", "inquiry", "tech_doc", "issue"]


class UnifiedSearchItemOut(BaseModel):
    source: SearchSource
    target_type: SearchTarget
    target_id: int
    title: str
    snippet: str
    score: float
    updated_at: datetime
    work_date: date | None = None
    author: str | None = None
    route: str
    category: str | None = None
    attach_count: int | None = None


class UnifiedSearchFacetsOut(BaseModel):
    by_source: dict[str, int] = Field(default_factory=dict)
    by_target: dict[str, int] = Field(default_factory=dict)


class ParsedIntentOut(BaseModel):
    periods: list[str] = Field(default_factory=list)
    teams: list[str] = Field(default_factory=list)
    statuses: list[str] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)


class UnifiedSearchOut(BaseModel):
    items: list[UnifiedSearchItemOut]
    facets: UnifiedSearchFacetsOut
    parsed_intent: ParsedIntentOut
    partial: bool = False
    unavailable_sources: list[str] = Field(default_factory=list)
