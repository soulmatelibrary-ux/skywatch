from datetime import date

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import ApiResponse
from app.core.security import verify_password as _verify_password
from app.schemas.user import LoginRequest, PasswordChange, PasswordVerifyRequest, UserOut
from app.services import auth_service
from app.services.schedule_service import get_today_shift_type

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=ApiResponse[UserOut])
def login(body: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = auth_service.authenticate(db, body.login_id, body.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="사번 또는 비밀번호가 올바르지 않습니다.")
    token = auth_service.create_session(db, user.id)
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * settings.SESSION_EXPIRE_HOURS,
    )
    user_out = UserOut.model_validate(user)
    user_out.today_shift_type = get_today_shift_type(db, user.id, date.today())
    return ApiResponse.ok(data=user_out, message="로그인 성공")


@router.post("/logout", response_model=ApiResponse[None])
def logout(
    response: Response,
    session_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
):
    if session_token:
        auth_service.delete_session(db, session_token)
    response.delete_cookie("session_token")
    return ApiResponse.ok(message="로그아웃 완료")


@router.post("/verify-password", response_model=ApiResponse[None])
def verify_password(
    body: PasswordVerifyRequest,
    current_user: User = Depends(get_current_user),
):
    if not _verify_password(body.password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="비밀번호가 올바르지 않습니다.")
    return ApiResponse.ok(message="확인 완료")


@router.post("/change-password", response_model=ApiResponse[None])
def change_password(
    body: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not _verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="현재 비밀번호가 올바르지 않습니다.")
    auth_service.change_password(db, current_user, body.new_password)
    return ApiResponse.ok(message="비밀번호가 변경되었습니다.")


@router.get("/me", response_model=ApiResponse[UserOut])
def me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_out = UserOut.model_validate(current_user)
    user_out.today_shift_type = get_today_shift_type(db, current_user.id, date.today())
    return ApiResponse.ok(data=user_out)
