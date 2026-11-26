from datetime import datetime

from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: int
    user_id: int
    type: str
    ref_type: str | None
    ref_id: int | None
    body: str | None
    read_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
