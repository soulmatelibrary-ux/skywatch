"""댓글 삭제·반응 API."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.log import Comment
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.log import ReactionToggle
from app.services import comment_service

router = APIRouter(prefix="/api/comments", tags=["comments"])


@router.get("/{comment_id}/log-id", response_model=ApiResponse[dict])
def get_comment_log_id(
    comment_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다")
    return ApiResponse.ok(data={"log_id": comment.log_id, "is_deleted": comment.is_deleted})


@router.delete("/{comment_id}", response_model=ApiResponse[None])
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    is_admin = current_user.role == "admin"
    ok = comment_service.delete_comment(db, comment_id, current_user.id, is_admin)
    if not ok:
        raise HTTPException(status_code=403, detail="삭제 권한이 없거나 이미 삭제된 댓글입니다")
    return ApiResponse.ok()


@router.post("/{comment_id}/reactions", response_model=ApiResponse[None])
def toggle_reaction(
    comment_id: int,
    body: ReactionToggle,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if len(body.emoji) > 10:
        raise HTTPException(status_code=400, detail="올바르지 않은 이모지입니다")
    comment_service.toggle_reaction(db, comment_id, current_user.id, body.emoji)
    return ApiResponse.ok()
