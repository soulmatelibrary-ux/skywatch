"""이월시간 관리 API (관리자 전용).
연도별로 직원 1인당 이월 대휴 시간을 관리합니다.
"""
from datetime import date
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.db.session import get_db
from app.models.schedule import ShiftCarryOver
from app.models.user import User
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/api/carry-over", tags=["carry-over"])


class CarryOverRow(BaseModel):
    user_id: int
    user_name: str
    team: str
    hours: float


class CarryOverSaveItem(BaseModel):
    user_id: int
    hours: float


@router.get("/{year}", response_model=ApiResponse[List[CarryOverRow]])
def get_carry_over(
    year: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """해당 연도 이월시간 목록 (활성 직원 전체 포함, 미입력은 0)."""
    entry_date = date(year, 1, 1)

    existing = {
        r.user_id: float(r.hours)
        for r in db.query(ShiftCarryOver).filter(
            ShiftCarryOver.entry_date == entry_date,
            ShiftCarryOver.entry_type == "이월",
        ).all()
    }

    users = (
        db.query(User)
        .filter(User.is_active.is_(True))
        .order_by(User.sort_order, User.id)
        .all()
    )

    rows = [
        CarryOverRow(
            user_id=u.id,
            user_name=u.name,
            team=u.team,
            hours=existing.get(u.id, 0.0),
        )
        for u in users
    ]
    return ApiResponse.ok(data=rows)


@router.put("/{year}", response_model=ApiResponse[None])
def save_carry_over(
    year: int,
    body: List[CarryOverSaveItem],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """해당 연도 이월시간 일괄 저장 (0 이하 항목 제외)."""
    entry_date = date(year, 1, 1)

    db.query(ShiftCarryOver).filter(
        ShiftCarryOver.entry_date == entry_date,
        ShiftCarryOver.entry_type == "이월",
    ).delete()

    for item in body:
        if item.hours > 0:
            db.add(ShiftCarryOver(
                user_id=item.user_id,
                entry_type="이월",
                entry_date=entry_date,
                hours=item.hours,
            ))

    db.commit()
    return ApiResponse.ok(data=None)
