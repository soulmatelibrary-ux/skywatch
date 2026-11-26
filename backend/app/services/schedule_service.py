"""스케줄 관련 비즈니스 로직."""
from datetime import date

from sqlalchemy.orm import Session

from app.models.schedule import LeaveRequest, Schedule, ShiftOverride


def get_today_shift_type(db: Session, user_id: int, target_date: date) -> str | None:
    """우선순위: shift_overrides > leave_requests > schedules"""
    # 1. 개인 근무 예외 (교환/대체)
    override = (
        db.query(ShiftOverride)
        .filter(ShiftOverride.date == target_date, ShiftOverride.actual_user_id == user_id)
        .first()
    )
    if override:
        from app.models.user import User
        original_user = db.query(User).filter(User.id == override.original_user_id).first()
        if original_user:
            sched = db.query(Schedule).filter(
                Schedule.date == target_date, Schedule.team == original_user.team
            ).first()
            if sched:
                return sched.shift_type

    # 2. 승인된 휴가
    leave = (
        db.query(LeaveRequest)
        .filter(
            LeaveRequest.user_id == user_id,
            LeaveRequest.date_from <= target_date,
            LeaveRequest.date_to >= target_date,
            LeaveRequest.status == "approved",
        )
        .first()
    )
    if leave:
        return "휴가"

    # 3. 기본 스케줄
    from app.models.user import User
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    sched = db.query(Schedule).filter(
        Schedule.date == target_date, Schedule.team == user.team
    ).first()
    return sched.shift_type if sched else None
