"""근무편성(duty-roster.html) 저장 API 스키마. base_rev 는 꼭 보내야 한다(첫 올리기는 null)."""
from typing import Any, Optional

from pydantic import BaseModel


class RosterSave(BaseModel):
    base_rev: Optional[int]
    data: dict[str, Any]
    snapshot: bool = False  # 통째 변경(복원·비우기·처음 올리기) — 직전 판을 항상 남긴다


class RosterRestore(BaseModel):
    base_rev: Optional[int]
