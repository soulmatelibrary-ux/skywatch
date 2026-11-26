"""신규 근무일지 API — 일지 쓰기·근무 일지 보기·카드 탐색·전달·메모."""
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.log import LogCard
from app.models.user import User
from app.schemas.common import ApiResponse, Pagination
from app.schemas.shift_log import (
    ExploreOut, MemoCreate, MissingShiftOut, ParticipantsUpdate, ShiftCardCreate, ShiftCardOut,
    ShiftCardUpdate, ShiftHistoryItem, ShiftViewOut, WorkerOut,
)
from app.services import (
    card_explore_service, card_memo_service, roster_service, shift_card_edit_service, shift_history_service,
    shift_log_service,
)
from app.services import work_thread_link_service as link_service
from app.services.card_vector_service import schedule_vectorize_card
from app.services.shift_card_dto import build_cards
from app.services.vector_service import schedule_vectorize_log

router = APIRouter(prefix="/api/shift-logs", tags=["shift-logs"])
_SHIFT = Query(pattern="^(주간|야간|주야)$")


def _split_ints(raw: Optional[str]) -> list[int]:
    return [int(x) for x in (raw or "").split(",") if x.strip().isdigit()]


def _card_out(db: Session, card: LogCard) -> ShiftCardOut:
    schedule_vectorize_log(card.log_id)
    schedule_vectorize_card(card.id)
    return build_cards(db, [card])[0]


@router.get("/view", response_model=ApiResponse[ShiftViewOut])
def get_view(date: date, shift_type: str = _SHIFT, db: Session = Depends(get_db),
             _: User = Depends(get_current_user)):
    return ApiResponse.ok(data=shift_log_service.get_view(db, date, shift_type))


@router.get("/missing", response_model=ApiResponse[list[MissingShiftOut]])
def get_missing(days: int = Query(7, ge=1, le=31), db: Session = Depends(get_db),
                _: User = Depends(get_current_user)):
    return ApiResponse.ok(data=roster_service.missing_shifts(db, days))


@router.get("/history", response_model=ApiResponse[list[ShiftHistoryItem]])
def get_history(days: int = Query(14, ge=1, le=120), date_to: Optional[date] = None, mine: bool = False,
                db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    end = date_to or roster_service.kst_today()
    return ApiResponse.ok(data=shift_history_service.history(db, me, end - timedelta(days=days), end, mine))


@router.get("/inbox", response_model=ApiResponse[list[ShiftCardOut]])
def get_inbox(date: date, shift_type: str = _SHIFT, db: Session = Depends(get_db),
              me: User = Depends(get_current_user)):
    return ApiResponse.ok(data=card_memo_service.inbox(db, me, date, shift_type))


@router.get("/explore", response_model=ApiResponse[ExploreOut])
def explore(q: Optional[str] = None, category_ids: Optional[str] = None, kinds: Optional[str] = None,
            worker_id: Optional[int] = None, date_from: Optional[date] = None, date_to: Optional[date] = None,
            late_only: bool = False, page: int = Query(1, ge=1), per_page: int = Query(60, ge=1, le=200),
            db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    kind_list = [k for k in (kinds or "").split(",") if k in card_explore_service.KIND_LABELS]
    data = card_explore_service.explore(db, (q or "").strip() or None, _split_ints(category_ids), kind_list,
                                        worker_id, date_from, date_to, late_only, page, per_page)
    pages = max(1, -(-data.total // per_page))
    return ApiResponse.ok(data=data, pagination=Pagination(page=page, per_page=per_page,
                                                           total=data.total, total_pages=pages))


@router.post("/cards", response_model=ApiResponse[ShiftCardOut], status_code=201)
def add_card(body: ShiftCardCreate, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    try:
        card, inquiry_nos = shift_log_service.add_card(db, me, body)
    except shift_log_service.ShiftLogError as e:
        raise HTTPException(status_code=400, detail=str(e))
    out = _card_out(db, card)
    out.inquiry_nos = inquiry_nos  # 문의 카드가 완료로 저장돼 문의사항에 자동 등록된 번호
    return ApiResponse.ok(data=out, message="카드를 추가했습니다")


@router.patch("/cards/{card_id}", response_model=ApiResponse[ShiftCardOut])
def update_card(card_id: int, body: ShiftCardUpdate, db: Session = Depends(get_db),
                me: User = Depends(get_current_user)):
    """쓰기 화면 카드 수정 (로그인한 누구나, 기존 업무일지 수정과 같은 권한). 이어짐 전환·충돌 검사 포함."""
    try:
        card = shift_card_edit_service.update_card(db, me, card_id, body)
    except shift_card_edit_service.CardEditNotFound:
        raise HTTPException(status_code=404, detail="카드를 찾을 수 없습니다")
    except shift_card_edit_service.CardEditConflict as e:
        raise HTTPException(status_code=409, detail=str(e))
    except (shift_card_edit_service.CardEditInvalid, link_service.ThreadLinkError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    schedule_vectorize_log(card.log_id)
    schedule_vectorize_card(card.id)
    return ApiResponse.ok(data=card, message="카드를 수정했습니다")


@router.delete("/cards/{card_id}", response_model=ApiResponse[None])
def delete_card(card_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    try:
        shift_card_edit_service.delete_card(db, me, card_id)
    except shift_card_edit_service.CardEditNotFound:
        raise HTTPException(status_code=404, detail="카드를 찾을 수 없습니다")
    return ApiResponse.ok(data=None, message="카드를 삭제했습니다")


@router.post("/memos", response_model=ApiResponse[ShiftCardOut], status_code=201)
def add_memo(body: MemoCreate, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    try:
        card = card_memo_service.add_memo(db, me, body)
    except shift_log_service.ShiftLogError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return ApiResponse.ok(data=_card_out(db, card), message="전달을 남겼습니다")


@router.post("/memos/{card_id}/check", response_model=ApiResponse[None])
def check_memo(card_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    if not card_memo_service.check(db, me, card_id):
        raise HTTPException(status_code=404, detail="전달사항을 찾을 수 없습니다")
    return ApiResponse.ok(data=None, message="확인했습니다")


@router.put("/participants", response_model=ApiResponse[list[WorkerOut]])
def put_participants(body: ParticipantsUpdate, db: Session = Depends(get_db),
                     me: User = Depends(get_current_user)):
    try:
        workers = shift_log_service.set_participants(db, me, body.date, body.shift_type, body.user_ids)
    except shift_log_service.ShiftLogError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return ApiResponse.ok(data=workers, message="근무자를 저장했습니다")
