"""사용자 API."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.user import UserAdminOut, UserCreate, UserOut, UserUpdate
from app.services import user_service

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=ApiResponse[list[UserOut]])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """활성 사용자 목록 (참여자 선택용)."""
    users = db.scalars(
        select(User)
        .where(User.is_active.is_(True))
        .order_by(User.sort_order, User.id)
    ).all()
    return ApiResponse.ok(data=[UserOut.model_validate(u) for u in users])


@router.get("/admin", response_model=ApiResponse[list[UserAdminOut]])
def list_all_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """전체 사용자 목록 (관리자 전용, 비활성 포함)."""
    return ApiResponse.ok(data=user_service.list_all_users(db))


@router.post("", response_model=ApiResponse[UserAdminOut], status_code=201)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """사용자 생성 (관리자 전용)."""
    existing = db.query(User).filter(User.login_id == body.login_id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 존재하는 사번입니다.")
    created = user_service.create_user(db, body, current_user.id)
    return ApiResponse.ok(data=created)


@router.put("/{user_id}", response_model=ApiResponse[UserAdminOut])
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """사용자 정보 수정 (관리자 전용)."""
    if body.login_id:
        conflict = db.query(User).filter(User.login_id == body.login_id, User.id != user_id).first()
        if conflict:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 사용 중인 사번입니다.")
    updated = user_service.update_user(db, user_id, body)
    if not updated:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return ApiResponse.ok(data=updated)


@router.delete("/{user_id}", response_model=ApiResponse[None])
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """사용자 비활성화 (관리자 전용)."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="자기 자신은 비활성화할 수 없습니다.")
    ok = user_service.deactivate_user(db, user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return ApiResponse.ok(data=None)


class PasswordResetBody(BaseModel):
    new_password: str


@router.post("/{user_id}/password", response_model=ApiResponse[None])
def reset_password(
    user_id: int,
    body: PasswordResetBody,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """비밀번호 초기화 (관리자 전용)."""
    if not body.new_password or len(body.new_password) < 4:
        raise HTTPException(status_code=400, detail="비밀번호는 4자 이상이어야 합니다.")
    ok = user_service.reset_user_password(db, user_id, body.new_password)
    if not ok:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return ApiResponse.ok(data=None)
