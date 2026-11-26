"""공지사항 CRUD API (관리자 전용)."""
from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.schedule import LeaveRequest, ShiftData, ShiftNotice, ShiftStaffMemo
from app.models.user import User
from app.schemas.common import ApiResponse

router = APIRouter(prefix="/api/notices", tags=["notices"])


class NoticeOut(BaseModel):
    id: int
    text: str
    start_date: date
    end_date: date

    model_config = {"from_attributes": True}


class NoticeCreate(BaseModel):
    text: str
    start_date: date
    end_date: date


class TickerItem(BaseModel):
    key: str
    text: str
    type: Literal["notice", "leave", "memo"]


def _day_label(d: date, today: date) -> str:
    diff = (d - today).days
    if diff == 0: return "오늘"
    if diff == 1: return "내일"
    return f"{d.month}/{d.day}"


@router.get("/ticker", response_model=list[TickerItem])
def get_ticker(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """티커용 통합 항목: 오늘 유효 공지 + 오늘~+4일 휴가·메모."""
    today = date.today()
    end = today + timedelta(days=4)
    items: list[TickerItem] = []

    # 1. 오늘 유효 공지 (소프트 삭제 제외)
    for n in (
        db.query(ShiftNotice)
        .filter(
            ShiftNotice.start_date <= today,
            ShiftNotice.end_date >= today,
            ShiftNotice.deleted_at.is_(None),
        )
        .order_by(ShiftNotice.created_at)
        .all()
    ):
        items.append(TickerItem(key=f"notice-{n.id}", text=n.text, type="notice"))

    # 2. 오늘~+4일 승인된 휴가 (날짜별 1건씩)
    leaves = (
        db.query(LeaveRequest, User)
        .join(User, LeaveRequest.user_id == User.id)
        .filter(
            LeaveRequest.status == "approved",
            LeaveRequest.date_from <= end,
            LeaveRequest.date_to >= today,
        )
        .order_by(LeaveRequest.date_from)
        .all()
    )
    seen_leave: set[str] = set()
    for leave, user in leaves:
        for i in range(5):
            d = today + timedelta(days=i)
            if leave.date_from <= d <= leave.date_to:
                key = f"leave-{leave.id}-{d}"
                if key not in seen_leave:
                    seen_leave.add(key)
                    label = _day_label(d, today)
                    items.append(TickerItem(key=key, text=f"[{label}] {user.name} 휴가", type="leave"))
                break

    # 3. 오늘~+4일 메모
    memos = (
        db.query(ShiftStaffMemo)
        .filter(ShiftStaffMemo.date >= today, ShiftStaffMemo.date <= end)
        .order_by(ShiftStaffMemo.date, ShiftStaffMemo.memo_type)
        .all()
    )
    for m in memos:
        line = m.memo_text or m.memo_type
        if not line or line.startswith("알림:") or line.startswith("{"):
            continue
        label = _day_label(m.date, today)
        items.append(TickerItem(key=f"memo-{m.id}", text=f"[{label}] {line}", type="memo"))

    # 4. skywatch_shift_data.memo (근무 일정 메모, 오늘~+4일)
    shift_rows = (
        db.query(ShiftData)
        .filter(ShiftData.date >= today, ShiftData.date <= end)
        .order_by(ShiftData.date)
        .all()
    )
    for sd in shift_rows:
        raw_memo = sd.memo
        if not raw_memo or not isinstance(raw_memo, list):
            continue
        label = _day_label(sd.date, today)
        for idx, line in enumerate(raw_memo):
            if not line or not isinstance(line, str):
                continue
            if line.startswith("알림:") or line.startswith("{"):
                continue
            items.append(TickerItem(
                key=f"shift-{sd.date}-{idx}",
                text=f"[{label}] {line}",
                type="memo",
            ))

    return items


@router.get("", response_model=ApiResponse[list[NoticeOut]])
def list_notices(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """전체 공지 목록 (만료 포함, 소프트 삭제 제외)."""
    rows = (
        db.query(ShiftNotice)
        .filter(ShiftNotice.deleted_at.is_(None))
        .order_by(ShiftNotice.start_date.desc(), ShiftNotice.created_at.desc())
        .all()
    )
    return ApiResponse.ok(data=[NoticeOut.model_validate(r) for r in rows])


@router.post("", response_model=ApiResponse[NoticeOut], status_code=201)
def create_notice(
    body: NoticeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """공지 추가."""
    if body.end_date < body.start_date:
        raise HTTPException(status_code=400, detail="종료일은 시작일 이후여야 합니다.")
    notice = ShiftNotice(
        text=body.text,
        start_date=body.start_date,
        end_date=body.end_date,
        created_by=current_user.id,
    )
    db.add(notice)
    db.commit()
    db.refresh(notice)
    return ApiResponse.ok(data=NoticeOut.model_validate(notice))


@router.delete("/{notice_id}", response_model=ApiResponse[None])
def delete_notice(
    notice_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """공지 삭제."""
    notice = db.query(ShiftNotice).filter(ShiftNotice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="공지를 찾을 수 없습니다.")
    db.delete(notice)
    db.commit()
    return ApiResponse.ok(data=None)
