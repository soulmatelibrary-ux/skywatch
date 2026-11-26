from datetime import date, datetime

from pydantic import BaseModel


class UserOut(BaseModel):
    id: int
    name: str
    login_id: str
    role: str
    team: str
    grade: str | None
    is_active: bool
    sort_order: int
    joined_at: date | None
    no_excel: bool
    created_at: datetime
    today_shift_type: str | None = None  # GET /api/auth/me 전용

    model_config = {"from_attributes": True}


class UserAdminOut(BaseModel):
    """관리자 전용 사용자 상세 조회용."""
    id: int
    name: str
    login_id: str
    role: str
    team: str
    grade: str | None
    is_active: bool
    sort_order: int
    joined_at: date | None
    resigned_at: date | None
    note: str | None
    no_excel: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    name: str
    login_id: str
    role: str
    team: str
    grade: str | None = None
    password: str
    sort_order: int = 0
    joined_at: date | None = None
    no_excel: bool = False
    note: str | None = None


class UserUpdate(BaseModel):
    name: str | None = None
    login_id: str | None = None
    role: str | None = None
    team: str | None = None
    grade: str | None = None
    is_active: bool | None = None
    sort_order: int | None = None
    joined_at: date | None = None
    resigned_at: date | None = None
    note: str | None = None
    no_excel: bool | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class LoginRequest(BaseModel):
    login_id: str
    password: str


class PasswordVerifyRequest(BaseModel):
    password: str
