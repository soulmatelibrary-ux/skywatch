"""통근비 계산기(commute-calc.html) 저장 API 스키마. base_rev 는 꼭 보내야 한다(처음 저장은 null)."""
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class CommuteCalcSave(BaseModel):
    base_rev: Optional[int]
    data: dict[str, Any]


class CommuteRow(BaseModel):
    """근태 한 줄 — 계산에 쓰는 칸만 받는다(사번·소속 등 다른 칸은 거절)."""
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=100)
    d: int = Field(ge=1, le=31)
    sched: str = Field("", max_length=200)
    daily: str = Field("", max_length=200)
    holi: str = Field("", max_length=200)
    duty: str = Field("", max_length=200)
    attend: str = Field("", max_length=20)


class CommuteMonthsUpload(BaseModel):
    """올린 파일 하나 — {"YYYY-MM": [근태 줄]}. 여기 든 달만 덮어쓴다."""
    file_name: str = Field("", max_length=255)
    months: dict[str, list[CommuteRow]] = Field(min_length=1, max_length=24)
