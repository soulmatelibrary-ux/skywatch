"""일지 목록/상세/작성/수정 API 라우터."""
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.log import (
    CommentCreate, CommentWithRepliesOut, LogCreate, LogDetailOut, LogLinkedCard, LogOut,
    LogUpdate, ReadStatusOut,
)
from app.services import comment_service, log_detail_service, log_service, log_write_service
from app.services.vector_service import schedule_vectorize_log

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.delete("/{log_id}", response_model=ApiResponse[None])
def delete_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.log_service import LogNotFoundError
    try:
        log_service.soft_delete_log(db, log_id, current_user.id)
        db.commit()
    except LogNotFoundError:
        raise HTTPException(status_code=404, detail="일지를 찾을 수 없습니다")
    return ApiResponse.ok(data=None)


@router.post("", response_model=ApiResponse[LogDetailOut], status_code=201)
def create_log(
    body: LogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = log_write_service.create_log(db, current_user.id, body)
    except log_write_service.DuplicateLogError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    schedule_vectorize_log(result.id)
    return ApiResponse.ok(data=result, message="일지가 작성되었습니다")


@router.put("/{log_id}", response_model=ApiResponse[LogDetailOut])
def update_log(
    log_id: int,
    body: LogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = log_write_service.update_log(db, log_id, current_user.id, body)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not result:
        raise HTTPException(status_code=404, detail="일지를 찾을 수 없습니다")
    schedule_vectorize_log(log_id)
    return ApiResponse.ok(data=result, message="일지가 수정되었습니다")


@router.get("", response_model=ApiResponse[list[LogOut]])
def list_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    team: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    q: Optional[str] = Query(None, max_length=200),
    category_id: Optional[int] = Query(None),
    exclude_notice: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, pagination = log_service.get_logs(
        db=db, current_user_id=current_user.id,
        page=page, per_page=per_page,
        team=team, date_from=date_from, date_to=date_to, q=q,
        category_id=category_id, exclude_notice=exclude_notice,
    )
    return ApiResponse.ok(data=items, pagination=pagination)


@router.get("/{log_id}", response_model=ApiResponse[LogDetailOut])
def get_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = log_detail_service.get_log(db, log_id, current_user.id)
    if not log:
        raise HTTPException(status_code=404, detail="일지를 찾을 수 없습니다")
    return ApiResponse.ok(data=log)


@router.post("/{log_id}/ack", response_model=ApiResponse[None])
def ack_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """모달 열람 시 자동 읽음 처리."""
    log_detail_service.ack_log(db, log_id, current_user.id)
    return ApiResponse.ok()


@router.post("/{log_id}/acknowledge", response_model=ApiResponse[None])
def acknowledge_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """명시적 '확인' 버튼 클릭."""
    ok = log_detail_service.acknowledge_log(db, log_id, current_user.id)
    if not ok:
        return ApiResponse.ok(message="이미 확인한 일지입니다")
    return ApiResponse.ok()


@router.get("/{log_id}/reads", response_model=ApiResponse[ReadStatusOut])
def get_read_status(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ApiResponse.ok(data=log_detail_service.get_read_status(db, log_id, current_user.id))


@router.get("/{log_id}/comments", response_model=ApiResponse[list[CommentWithRepliesOut]])
def get_comments(
    log_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return ApiResponse.ok(data=comment_service.get_comments(db, log_id))


@router.post("/{log_id}/comments", response_model=ApiResponse[CommentWithRepliesOut])
def add_comment(
    log_id: int,
    body: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not body.body.strip():
        raise HTTPException(status_code=400, detail="댓글 내용을 입력해 주세요")
    out = comment_service.create_comment(db, log_id, current_user.id, body.body, body.parent_id)
    return ApiResponse.ok(data=CommentWithRepliesOut(**out.model_dump()))


@router.get("/{log_id}/linked-cards", response_model=ApiResponse[list[LogLinkedCard]])
def get_linked_cards(
    log_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """현재 로그의 카드 중 다른 로그의 카드와 연결된 카드들을 조회합니다."""
    return ApiResponse.ok(data=log_detail_service.get_linked_cards(db, log_id))
