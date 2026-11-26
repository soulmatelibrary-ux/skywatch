"""신규 근무일지 화면(일지 쓰기·보기·카드 탐색·과제) 스키마."""
from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

ShiftType = Literal["주간", "야간", "주야"]


class WorkerOut(BaseModel):
    user_id: int
    name: str
    team: Optional[str] = None
    role: str


class MemoInfo(BaseModel):
    target_type: str
    target_user_id: Optional[int] = None
    target_user_name: Optional[str] = None
    keep: str
    keep_until: Optional[date] = None
    checked_user_ids: list[int] = []
    checked_names: list[str] = []


class AttachmentBrief(BaseModel):
    id: int
    original_name: str
    file_size: int


class ShiftCardOut(BaseModel):
    id: int
    log_id: int
    date: date
    shift_type: str
    title: str
    body_text: str
    content: Optional[str] = None
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    status: str
    author_id: Optional[int] = None
    author_name: Optional[str] = None
    created_at: datetime
    kind: str
    thread_id: Optional[int] = None
    thread_title: Optional[str] = None
    thread_status: Optional[str] = None
    memo: Optional[MemoInfo] = None
    is_late: bool = False
    is_proxy: bool = False
    attachments: list[AttachmentBrief] = []
    # 카드 추가 응답에만 채움 — 문의 분류 카드가 완료로 저장돼 문의사항에 자동 등록된 번호
    inquiry_nos: list[str] = []
    # 카드 수정 화면용 (기본값 None — 다른 화면은 쓰지 않는다)
    updated_at: Optional[datetime] = None        # 수정 충돌 검사(expected_updated_at)에 되돌려 보내는 값
    edited_by_name: Optional[str] = None
    edited_at: Optional[datetime] = None
    thread_card_count: Optional[int] = None      # 이어지는 일(thread) 묶음의 카드 수 (삭제 제외)


class RoutineOut(BaseModel):
    title: str
    body: str = ""
    done: bool


class HandoverOut(BaseModel):
    date: date
    shift_type: str
    team: str
    cards: list[ShiftCardOut]


class ShiftViewOut(BaseModel):
    date: date
    shift_type: str
    log_id: Optional[int] = None
    team: str
    workers: list[WorkerOut]
    is_past: bool
    conflict: Optional[str] = None
    cards: list[ShiftCardOut]
    handover: Optional[HandoverOut] = None
    routines: list[RoutineOut] = []


class MissingShiftOut(BaseModel):
    date: date
    shift_type: str
    team: str
    workers: list[WorkerOut]


class ShiftHistoryItem(BaseModel):
    date: date
    shift_type: str
    log_id: Optional[int] = None
    team: str
    worker_names: list[str]
    card_count: int
    memo_count: int
    has_late: bool
    has_proxy: bool
    missing: bool


class ShiftCardCreate(BaseModel):
    date: date
    shift_type: ShiftType
    title: str = Field(min_length=1, max_length=255)
    body: str = ""
    content: Optional[str] = None   # 편집기 HTML(표·이미지 포함). 있으면 body 대신 그대로 저장
    category_id: Optional[int] = None
    thread_id: Optional[int] = None
    new_thread: bool = False


class ShiftCardUpdate(BaseModel):
    """쓰기 화면 카드 수정. thread_mode: keep 유지, single 이 카드를 묶음에서 빼 당일 종료, thread 이어지는 일로."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = None
    category_id: Optional[int] = None
    thread_mode: Literal["keep", "single", "thread"] = "keep"
    expected_updated_at: Optional[datetime] = None
    # 수정을 시작할 때의 값. 보내면 updated_at 이 달라도 제목·본문·분류가 실제로 달라졌을 때만 충돌로 본다 (상태 변경 등 오탐 방지)
    base_title: Optional[str] = None
    base_content: Optional[str] = None
    base_category_id: Optional[int] = None


class MemoCreate(BaseModel):
    date: date
    shift_type: ShiftType
    text: str = Field(min_length=1, max_length=255)
    category_id: Optional[int] = None
    target_type: Literal["next", "all", "user"] = "next"
    target_user_id: Optional[int] = None
    keep: Literal["checked", "shift", "days"] = "checked"


class ParticipantsUpdate(BaseModel):
    date: date
    shift_type: ShiftType
    user_ids: list[int] = Field(min_length=1)


class PhaseIn(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    start_month: str = Field(pattern=r"^\d{4}-\d{2}$")
    end_month: str = Field(pattern=r"^\d{4}-\d{2}$")


class PhaseOut(PhaseIn):
    seq: int


class LastCardInfo(BaseModel):
    date: date
    shift_type: str
    title: str
    next_step: Optional[str] = None
    summary: str = ""


class ThreadOut(BaseModel):
    id: int
    kind: str
    title: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    status: str
    owner_id: Optional[int] = None
    owner_name: Optional[str] = None
    started_on: date
    closed_on: Optional[date] = None
    current_phase: int
    recur_month: Optional[int] = None
    phases: list[PhaseOut] = []
    card_count: int = 0
    author_count: int = 0
    last_card: Optional[LastCardInfo] = None
    recent_shifts: list[str] = []


class ThreadDetailOut(ThreadOut):
    cards: list[ShiftCardOut] = []


class ThreadCreate(BaseModel):
    kind: Literal["thread", "project"] = "project"
    title: str = Field(min_length=1, max_length=255)
    category_id: Optional[int] = None
    started_on: Optional[date] = None
    recur_month: Optional[int] = Field(default=None, ge=1, le=12)
    phases: list[PhaseIn] = []


class ThreadUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    status: Optional[Literal["open", "hold", "done"]] = None
    current_phase: Optional[int] = Field(default=None, ge=0)


class ExploreFacet(BaseModel):
    key: str
    label: str
    color: Optional[str] = None
    count: int


class ExploreOut(BaseModel):
    items: list[ShiftCardOut]
    total: int
    category_facets: list[ExploreFacet]
    kind_facets: list[ExploreFacet]


class CandidateOut(BaseModel):
    norm: str
    count: int
    first_date: date
    last_date: date
    examples: list[str]
    recommend: str


class ThreadCardsLink(BaseModel):
    """이미 완료된 카드(기존 업무일지 카드 포함)를 골라 한 묶음으로 연결. thread_id 가 없으면 title 로 새 묶음을 만든다."""
    card_ids: list[int] = Field(min_length=1, max_length=200)
    thread_id: Optional[int] = None
    title: Optional[str] = Field(default=None, max_length=255)


class CandidateApply(BaseModel):
    norm: str = Field(min_length=1)
    action: Literal["project", "thread", "skip"]
