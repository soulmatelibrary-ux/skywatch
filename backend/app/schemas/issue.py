from datetime import date, datetime
from pydantic import BaseModel


class IssueCommentCreate(BaseModel):
    content: str
    is_certified: bool = False


class IssueCommentOut(BaseModel):
    id: int
    issue_id: int
    content: str
    is_certified: bool
    created_by: int | None
    created_by_name: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class IssueCreate(BaseModel):
    kac_pr_no: str | None = None
    lm_pr_no: str | None = None
    title: str
    content: str | None = None
    status: str = "진행중"
    acc_type: str | None = None
    keyword: str | None = None
    version: str | None = None
    mod_version: str | None = None
    reg_date: date
    action_date: date | None = None
    acc_pr: str | None = None
    assigned_to: int | None = None


class IssueUpdate(BaseModel):
    kac_pr_no: str | None = None
    lm_pr_no: str | None = None
    title: str | None = None
    content: str | None = None
    status: str | None = None
    acc_type: str | None = None
    keyword: str | None = None
    version: str | None = None
    mod_version: str | None = None
    reg_date: date | None = None
    action_date: date | None = None
    acc_pr: str | None = None
    assigned_to: int | None = None


class AttachmentSimple(BaseModel):
    id: int
    original_name: str
    file_name: str
    file_size: int

    model_config = {"from_attributes": True}


class IssueOut(BaseModel):
    id: int
    source_seq: int | None
    kac_pr_no: str | None
    lm_pr_no: str | None
    title: str
    content: str | None
    status: str
    acc_type: str | None
    keyword: str | None
    version: str | None
    mod_version: str | None
    reg_date: date
    action_date: date | None
    acc_pr: str | None
    created_by: int | None
    created_by_name: str | None
    assigned_to: int | None
    assigned_to_name: str | None
    created_at: datetime
    updated_at: datetime
    comments: list[IssueCommentOut] = []
    attachments: list[AttachmentSimple] = []

    model_config = {"from_attributes": True}


class IssueListItem(BaseModel):
    id: int
    kac_pr_no: str | None
    lm_pr_no: str | None
    title: str
    status: str
    acc_type: str | None
    version: str | None
    mod_version: str | None
    reg_date: date
    action_date: date | None
    created_by_name: str | None
    assigned_to_name: str | None
    comment_count: int = 0
    attachment_count: int = 0

    model_config = {"from_attributes": True}
