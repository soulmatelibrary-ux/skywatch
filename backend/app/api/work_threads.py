"""과제(이어지는 일·장기 과제)와 과제 묶기 API."""
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.shift_log import (
    CandidateApply, CandidateOut, ThreadCardsLink, ThreadCreate, ThreadDetailOut, ThreadOut, ThreadUpdate,
)
from app.services import work_thread_candidate_service, work_thread_link_service, work_thread_service

router = APIRouter(prefix="/api/work-threads", tags=["work-threads"])
_STATUSES = {"open", "hold", "done"}


@router.get("", response_model=ApiResponse[list[ThreadOut]])
def list_threads(kind: Optional[str] = Query(None, pattern="^(thread|project)$"),
                 status: Optional[str] = None, as_of: Optional[date] = None,
                 closed_since: Optional[date] = None,
                 db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    statuses = [s for s in (status or "").split(",") if s in _STATUSES]
    return ApiResponse.ok(data=work_thread_service.list_threads(db, kind, statuses, as_of, closed_since))


@router.get("/candidates", response_model=ApiResponse[list[CandidateOut]])
def list_candidates(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return ApiResponse.ok(data=work_thread_candidate_service.candidates(db))


@router.post("/candidates/apply", response_model=ApiResponse[int])
def apply_candidate(body: CandidateApply, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    made = work_thread_candidate_service.apply(db, me.id, body)
    return ApiResponse.ok(data=made, message=f"과제 {made}건을 만들었습니다")


@router.post("/link-cards", response_model=ApiResponse[ThreadDetailOut])
def link_cards(body: ThreadCardsLink, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    try:
        result = work_thread_link_service.link_cards(db, me.id, body)
    except work_thread_link_service.ThreadLinkError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return ApiResponse.ok(data=result, message=f"카드 {len(set(body.card_ids))}장을 묶었습니다")


@router.delete("/{thread_id}/cards/{card_id}", response_model=ApiResponse[ThreadDetailOut])
def unlink_card(thread_id: int, card_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    try:
        return ApiResponse.ok(data=work_thread_link_service.unlink_card(db, thread_id, card_id, me.id), message="묶음에서 뺐습니다")
    except work_thread_link_service.ThreadLinkError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/{thread_id}", response_model=ApiResponse[ThreadDetailOut])
def get_thread(thread_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    result = work_thread_service.get_thread(db, thread_id)
    if result is None:
        raise HTTPException(status_code=404, detail="과제를 찾을 수 없습니다")
    return ApiResponse.ok(data=result)


@router.post("", response_model=ApiResponse[ThreadDetailOut], status_code=201)
def create_thread(body: ThreadCreate, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    return ApiResponse.ok(data=work_thread_service.create_thread(db, me.id, body), message="과제를 만들었습니다")


@router.patch("/{thread_id}", response_model=ApiResponse[ThreadDetailOut])
def update_thread(thread_id: int, body: ThreadUpdate, db: Session = Depends(get_db),
                  me: User = Depends(get_current_user)):
    result = work_thread_service.update_thread(db, thread_id, me.id, body)
    if result is None:
        raise HTTPException(status_code=404, detail="과제를 찾을 수 없습니다")
    return ApiResponse.ok(data=result)


@router.post("/{thread_id}/copy", response_model=ApiResponse[ThreadDetailOut], status_code=201)
def copy_thread(thread_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    result = work_thread_service.copy_next_year(db, thread_id, me.id)
    if result is None:
        raise HTTPException(status_code=404, detail="과제를 찾을 수 없습니다")
    return ApiResponse.ok(data=result, message="다음 해 과제를 만들었습니다")
