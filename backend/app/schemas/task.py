from datetime import datetime

from pydantic import BaseModel


class TaskOut(BaseModel):
    id: int
    sender_id: int
    title: str
    body: str | None
    importance: str
    due_date: str | None
    recipients_mode: str
    recipients: list[int]
    target_teams: list[str]
    completed_by: list[int]
    linked_card_id: int | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TaskCreate(BaseModel):
    title: str
    body: str | None = None
    importance: str = "normal"
    due_date: str | None = None
    recipients_mode: str = "individual"
    recipients: list[int] = []
    target_teams: list[str] = []
    linked_card_id: int | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    importance: str | None = None
    due_date: str | None = None
    recipients_mode: str | None = None
    recipients: list[int] | None = None
    target_teams: list[str] | None = None


class RecurringTemplateOut(BaseModel):
    id: int
    name: str
    repeat_type: str
    repeat_days: list | None
    repeat_time: str | None
    template_title: str | None
    template_body: str | None
    template_importance: str
    target_teams: list[str]
    target_shift_types: list[str]
    is_active: bool
    next_run_at: datetime | None
    last_executed_at: datetime | None

    model_config = {"from_attributes": True}


class RecurringTemplateCreate(BaseModel):
    name: str
    repeat_type: str = "daily"  # daily|weekly|monthly|quarterly
    repeat_days: list | None = None
    repeat_time: str | None = None
    template_title: str | None = None
    template_body: str | None = None
    template_importance: str = "normal"
    target_teams: list[str] = []
    target_shift_types: list[str] = []


class RecurringTemplateUpdate(BaseModel):
    name: str | None = None
    repeat_type: str | None = None
    repeat_days: list | None = None
    repeat_time: str | None = None
    template_title: str | None = None
    template_body: str | None = None
    template_importance: str | None = None
    target_teams: list[str] | None = None
    target_shift_types: list[str] | None = None
    is_active: bool | None = None
