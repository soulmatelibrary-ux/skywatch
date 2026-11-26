"""근무 일정 / 연차 / 대체 조회 API."""
import calendar
import json
from datetime import date as date_type, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.schedule import Schedule, LeaveRequest, ShiftOverride, ShiftStaffMemo, ShiftData
from app.models.user import User
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


def _validate_year_month(year: int, month: int) -> None:
    if not (1 <= month <= 12):
        raise HTTPException(400, "month는 1~12 사이여야 합니다.")
    if not (2000 <= year <= 2100):
        raise HTTPException(400, "유효하지 않은 year 값입니다.")


@router.get("", response_model=ApiResponse[list[dict]])
def get_schedules(year: int, month: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    _validate_year_month(year, month)
    month_start = date_type(year, month, 1)
    month_end = date_type(year, month, calendar.monthrange(year, month)[1])
    rows = db.query(Schedule).filter(
        Schedule.date >= month_start,
        Schedule.date <= month_end,
    ).all()
    return ApiResponse.ok(data=[
        {"id": r.id, "team": r.team, "date": r.date.isoformat(), "shift_type": r.shift_type, "capacity": r.capacity}
        for r in rows
    ])


@router.get("/leaves", response_model=ApiResponse[list[dict]])
def get_leaves(year: int, month: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    _validate_year_month(year, month)
    month_start = date_type(year, month, 1)
    month_end = date_type(year, month, calendar.monthrange(year, month)[1])
    rows = db.query(LeaveRequest).filter(
        LeaveRequest.date_from <= month_end,
        LeaveRequest.date_to >= month_start,
    ).all()
    return ApiResponse.ok(data=[
        {"id": r.id, "user_id": r.user_id, "date_from": r.date_from.isoformat(),
         "date_to": r.date_to.isoformat(), "status": r.status}
        for r in rows
    ])


@router.get("/overrides", response_model=ApiResponse[list[dict]])
def get_overrides(year: int, month: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    _validate_year_month(year, month)
    month_start = date_type(year, month, 1)
    month_end = date_type(year, month, calendar.monthrange(year, month)[1])
    rows = db.query(ShiftOverride).filter(
        ShiftOverride.date >= month_start,
        ShiftOverride.date <= month_end,
    ).all()
    return ApiResponse.ok(data=[
        {"id": r.id, "date": r.date.isoformat(),
         "original_user_id": r.original_user_id, "actual_user_id": r.actual_user_id, "type": r.type}
        for r in rows
    ])


# ── 홈 화면 근무자 조정 (당일 임시 편집, ShiftStaffMemo 재활용) ──

class HomeWorkersBody(BaseModel):
    date: date_type
    shift_type: Literal['주간', '야간', '일근']
    user_ids: list[int] = []
    leave_ids: list[int] = []
    temp_names: list[str] = []


@router.get("/home-workers", response_model=ApiResponse[dict])
def get_home_workers(
    date: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    target = date_type.fromisoformat(date)
    result: dict[str, dict | None] = {}
    for shift in ["주간", "야간", "일근"]:
        memo = (
            db.query(ShiftStaffMemo)
            .filter(
                ShiftStaffMemo.date == target,
                ShiftStaffMemo.memo_type == f"home_{shift}",
            )
            .order_by(ShiftStaffMemo.updated_at.desc())
            .first()
        )
        try:
            result[shift] = json.loads(memo.memo_text) if memo and memo.memo_text else None
        except (json.JSONDecodeError, TypeError):
            result[shift] = None
    return ApiResponse.ok(data=result)


@router.post("/home-workers", response_model=ApiResponse[dict])
def save_home_workers(
    body: HomeWorkersBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        target = body.date
        memo_type = f"home_{body.shift_type}"
        payload = json.dumps({
            "user_ids": body.user_ids,
            "leave_ids": body.leave_ids,
            "temp_names": body.temp_names,
        }, ensure_ascii=False)

        existing = (
            db.query(ShiftStaffMemo)
            .filter(
                ShiftStaffMemo.date == target,
                ShiftStaffMemo.user_id == current_user.id,
                ShiftStaffMemo.memo_type == memo_type,
            )
            .first()
        )
        if existing:
            existing.memo_text = payload
        else:
            db.add(ShiftStaffMemo(
                date=target,
                user_id=current_user.id,
                memo_type=memo_type,
                memo_text=payload,
            ))
        db.commit()
        return ApiResponse.ok(data={"user_ids": body.user_ids, "leave_ids": body.leave_ids, "temp_names": body.temp_names})
    except Exception as e:
        db.rollback()
        print(f"[ERROR] save_home_workers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ── shift_code 기반 근무자 조회 (근무스케줄 달력 기반) ──

class ShiftWorkerInfo(BaseModel):
    shift: str          # 주간, 야간, 일근
    code: str           # 조 코드 (A, B, C, D, day)
    user_id: int
    name: str
    is_changed: bool    # 기본 4개 교대(AB,BC,CD,DA)와 다르면 True


@router.get("/shift-workers", response_model=ApiResponse[list[ShiftWorkerInfo]])
def get_shift_workers(
    date: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """shift_code 기반 근무자 조회. 기본 4개 교대와 다르면 is_changed=True"""
    try:
        target = date_type.fromisoformat(date)

        # ShiftData에서 shift_code 조회
        shift_data = db.query(ShiftData).filter(ShiftData.date == target).first()
        if not shift_data or not shift_data.shift_code:
            return ApiResponse.ok(data=[])

        shift_code = shift_data.shift_code
        basic_codes = {'AB', 'BC', 'CD', 'DA'}
        is_changed = shift_code not in basic_codes

        # shift_code 파싱: "AB" → [(주간='A'), (야간='B')]
        shifts_info = []
        if len(shift_code) >= 2:
            shifts_info.append(('주간', shift_code[0]))
            shifts_info.append(('야간', shift_code[1]))

        # 각 shift별로 근무자 1명 조회
        result: list[ShiftWorkerInfo] = []
        active_users = db.query(User).filter(User.is_active == True).all()

        for shift_name, team_code in shifts_info:
            # 교대 코드(A/B/C/D)는 대소문자 무관 비교
            team = team_code.upper()

            # 해당 team의 첫 번째 활성 사용자 조회
            user = next((u for u in active_users if (u.team or '').upper() == team), None)
            if user:
                result.append(ShiftWorkerInfo(
                    shift=shift_name,
                    code=team_code,
                    user_id=user.id,
                    name=user.name,
                    is_changed=is_changed,
                ))

        # 일근 추가 (day 팀)
        day_user = next((u for u in active_users if u.team == 'day' and u.role != 'admin'), None)
        if day_user:
            result.append(ShiftWorkerInfo(
                shift='일근',
                code='day',
                user_id=day_user.id,
                name=day_user.name,
                is_changed=is_changed,
            ))

        return ApiResponse.ok(data=result)
    except Exception as e:
        print(f"[ERROR] get_shift_workers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# 4조 교대 기준일 및 일별 순환 배열 (shift-calendar.html과 동일)
_SHIFT_BASE_DATE = date_type(2025, 6, 2)
_SHIFT_CYCLE = ['AB', 'DA', 'CD', 'BC']


class GenerateRotationBody(BaseModel):
    base_date: date_type   # 이 날짜가 속한 주부터 시작
    weeks: int = 12        # 생성할 주 수 (기본 12주)


@router.post("/generate-rotation", response_model=ApiResponse[dict])
def generate_rotation(
    body: GenerateRotationBody,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """기준 날짜부터 N주간 shift_code를 skywatch_shift_data에 upsert.
    shift-calendar.html과 동일한 공식으로 날짜별 코드를 계산해 저장.
    기존 메모 등 다른 필드는 보존.
    """
    if not (1 <= body.weeks <= 52):
        raise HTTPException(400, "weeks는 1~52 사이여야 합니다.")

    monday = body.base_date - timedelta(days=body.base_date.weekday())

    upserted = 0
    for week_offset in range(body.weeks):
        week_start = monday + timedelta(weeks=week_offset)

        for day_offset in range(7):
            d = week_start + timedelta(days=day_offset)
            diff = (d - _SHIFT_BASE_DATE).days
            code = _SHIFT_CYCLE[diff % 4]

            existing = db.query(ShiftData).filter(ShiftData.date == d).first()
            if existing:
                existing.shift_code = code
            else:
                db.add(ShiftData(date=d, shift_code=code))
            upserted += 1

    db.commit()
    return ApiResponse.ok(data={"weeks": body.weeks, "rows": upserted})
