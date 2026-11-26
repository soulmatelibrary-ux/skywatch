from datetime import date as _date, datetime
from typing import Literal
from pydantic import BaseModel, Field

ShiftType = Literal["주간", "야간", "주야", "비번", "휴가", "공지"]


class CardCategoryOut(BaseModel):
    id: int
    name: str
    color: str | None
    sort_order: int
    is_active: bool

    model_config = {"from_attributes": True}


class CardCategoryCreate(BaseModel):
    name: str
    color: str | None = None
    sort_order: int = 0


class CardCategoryUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class CardStatusOut(BaseModel):
    id: int
    key: str
    label: str
    color: str | None
    sort_order: int
    is_system: bool
    is_active: bool

    model_config = {"from_attributes": True}


class CardStatusCreate(BaseModel):
    key: str
    label: str
    color: str | None = None
    sort_order: int = 0


class CardStatusUpdate(BaseModel):
    label: str | None = None
    color: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class ParticipantOut(BaseModel):
    user_id: int
    name: str | None = None
    role: str
    sub_for: int | None
    sub_for_name: str | None = None
    note: str | None


class AttachmentOut(BaseModel):
    id: int
    card_id: int
    original_name: str
    file_name: str
    file_size: int
    mime_type: str | None
    uploaded_by: int
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_attachment(cls, a: object) -> "AttachmentOut":
        return cls(
            id=a.id, card_id=a.owner_id,  # type: ignore[attr-defined]
            original_name=a.original_name,  # type: ignore[attr-defined]
            file_name=a.file_name,  # type: ignore[attr-defined]
            file_size=a.file_size,  # type: ignore[attr-defined]
            mime_type=a.mime_type,  # type: ignore[attr-defined]
            uploaded_by=a.uploaded_by,  # type: ignore[attr-defined]
            created_at=a.created_at,  # type: ignore[attr-defined]
        )


class LogCardOut(BaseModel):
    id: int
    log_id: int
    category_id: int | None
    category_name: str | None = None
    category_color: str | None = None
    position: int
    title: str
    content: str | None
    status: str
    status_color: str | None = None
    completed_by: int | None
    completed_by_name: str | None = None
    completed_at: datetime | None
    last_edited_by: int | None = None
    last_edited_by_name: str | None = None
    created_by: int
    created_at: datetime
    updated_at: datetime
    attachments: list[AttachmentOut] = []
    thread_card_count: int = 0  # 이어지는 일 묶음에 속하면 묶음 카드 수 (2 이상이면 완료 시 묶음 전체 종료 확인)

    model_config = {"from_attributes": True}


class LogOut(BaseModel):
    id: int
    author_id: int
    author_name: str | None = None
    team: str | None = None
    primary_worker_name: str | None = None
    primary_worker_team: str | None = None
    date: _date
    shift_type: str
    title: str | None
    tags: list[str] = []
    created_at: datetime
    updated_at: datetime
    card_count: int = 0
    open_count: int = 0
    in_progress_count: int = 0
    comment_count: int = 0
    attach_count: int = 0
    link_count: int = 0
    is_read: bool = False

    model_config = {"from_attributes": True}


class LogDetailOut(LogOut):
    has_acked: bool = False
    cards: list[LogCardOut] = []
    participants: list[ParticipantOut] = []


class ParticipantIn(BaseModel):
    user_id: int
    role: str = "primary"
    sub_for: int | None = None
    note: str | None = None


class CardCreate(BaseModel):
    category_id: int | None = None
    title: str
    content: str | None = None
    position: int = 0


class CardUpsert(BaseModel):
    """작성/수정 모달에서 카드 배열 항목 (id=None → 신규)."""
    id: int | None = None
    category_id: int | None = None
    title: str
    content: str | None = None
    position: int = 0
    status: str | None = None
    to_delete: bool = False


class LogCreate(BaseModel):
    date: _date
    shift_type: ShiftType
    title: str | None = None
    tags: list[str] = []
    cards: list[CardUpsert] = []
    participants: list[ParticipantIn] = []


class LogUpdate(BaseModel):
    date: _date | None = None
    shift_type: ShiftType | None = None
    title: str | None = None
    tags: list[str] | None = None
    cards: list[CardUpsert] = []
    participants: list[ParticipantIn] | None = None


class CardUpdate(BaseModel):
    """카드 인라인 편집 (제목·본문·카테고리)."""
    title: str | None = None
    content: str | None = None
    category_id: int | None = None


class CardStatusPatch(BaseModel):
    status: str = Field(min_length=1, max_length=30)


class LinkToChainRequest(BaseModel):
    target_card_id: int


class CommentCreate(BaseModel):
    body: str
    parent_id: int | None = None


class ReactionGroup(BaseModel):
    emoji: str
    user_ids: list[int]
    user_names: list[str]


class ReactionToggle(BaseModel):
    emoji: str


class CommentOut(BaseModel):
    id: int
    log_id: int
    author_id: int
    author_name: str | None = None
    parent_id: int | None
    body: str
    created_at: datetime
    updated_at: datetime
    is_deleted: bool
    reactions: list[ReactionGroup] = []

    model_config = {"from_attributes": True}


class CommentWithRepliesOut(CommentOut):
    replies: list[CommentOut] = []


class UserNameOut(BaseModel):
    user_id: int
    name: str


class ReadStatusOut(BaseModel):
    reads: list[UserNameOut]
    acks: list[UserNameOut]
    participant_ids: list[int]
    has_acked: bool = False


class CardLinkResult(BaseModel):
    """링크 검색 결과 항목."""
    card_id: int
    card_title: str
    log_id: int
    log_date: str
    log_title: str | None
    log_author: str | None
    log_shift_type: str | None


class CardChainNode(BaseModel):
    """연결 체인 노드 (재귀)."""
    card_id: int
    card_title: str
    log_id: int
    log_date: str
    log_title: str | None
    log_author: str | None
    log_shift_type: str | None
    status: str
    children: list["CardChainNode"] = []

    model_config = {"from_attributes": True}


CardChainNode.model_rebuild()


class ChainLogInfo(BaseModel):
    """체인에 포함된 로그 정보."""
    log_id: int
    log_date: str
    log_title: str | None
    log_shift_type: str | None


class ChainInfo(BaseModel):
    """연결된 카드 체인 정보."""
    root_card_id: int
    root_card_title: str
    logs: list[ChainLogInfo] = []
    total_cards: int = 0
    completed_cards: int = 0
    recent_status_key: str = "open"
    recent_status_label: str = "진행중"
    recent_status_color: str | None = None


class BoardCardOut(BaseModel):
    """인계보드 카드 항목."""
    id: int
    log_id: int
    log_date: str
    log_shift_type: str
    title: str
    status: str
    category_id: int | None
    category_name: str | None
    category_color: str | None
    last_edited_by: int | None
    last_edited_by_name: str | None
    handover_count: int = 0


class BoardCategoryOut(BaseModel):
    """인계보드 카테고리 컬럼."""
    id: int
    name: str
    color: str | None
    count: int
    cards: list[BoardCardOut] = []


class LinkedCardInfo(BaseModel):
    """연결된 카드 정보 (다른 로그의 카드)."""
    card_id: int
    card_title: str
    log_id: int
    log_date: str
    log_title: str | None


class LogLinkedCard(BaseModel):
    """로그의 카드와 그 카드가 연결된 다른 로그의 카드들."""
    card_id: int
    card_title: str
    linked_cards: list[LinkedCardInfo] = []

    model_config = {"from_attributes": True}
