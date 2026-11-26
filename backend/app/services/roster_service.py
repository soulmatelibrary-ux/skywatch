"""근무표(shift_data) 기반 근무자·근무조 계산, 지연 작성 기준, 빠뜨린 근무 계산."""
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.log import Log
from app.models.schedule import ShiftData
from app.models.user import User

KST = timezone(timedelta(hours=9))
BASE_SHIFTS = ("주간", "야간")
NOTICE_SHIFT = "공지"


def kst_now() -> datetime:
    return datetime.now(KST)


def kst_today() -> date:
    return kst_now().date()


def teams_from_code(shift_code: str | None, shift: str) -> list[str]:
    """shift_code 'AB' → 주간 A, 야간 B, 주야 A·B."""
    code = (shift_code or "").strip().upper()
    if len(code) < 2:
        return []
    if shift == "주간":
        return [code[0]]
    if shift == "야간":
        return [code[1]]
    if shift == "주야":
        return list(dict.fromkeys([code[0], code[1]]))
    return []


def shift_codes(db: Session, date_from: date, date_to: date) -> dict[date, str]:
    rows = db.execute(
        select(ShiftData.date, ShiftData.shift_code)
        .where(ShiftData.date >= date_from, ShiftData.date <= date_to)
    ).all()
    return {d: c for d, c in rows if c}


def team_users(db: Session) -> dict[str, User]:
    """근무조별 대표 근무자(기존 근무자 조회 API와 같은 규칙: 조별 첫 활성 사용자)."""
    users = db.scalars(
        select(User).where(User.is_active.is_(True)).order_by(User.sort_order, User.id)
    ).all()
    result: dict[str, User] = {}
    for u in users:
        team = (u.team or "").upper()
        if team and team not in result:
            result[team] = u
    return result


def roster_workers(db: Session, d: date, shift: str) -> list[dict]:
    code = shift_codes(db, d, d).get(d)
    teams = teams_from_code(code, shift)
    by_team = team_users(db)
    return [
        {"user_id": by_team[t].id, "name": by_team[t].name, "team": t, "role": "roster"}
        for t in teams if t in by_team
    ]


def roster_team_label(db: Session, d: date, shift: str) -> str:
    return "·".join(teams_from_code(shift_codes(db, d, d).get(d), shift))


def late_deadline(d: date, shift: str) -> datetime:
    """주간은 당일 자정, 야간·주야는 다음 날 정오(KST)까지를 정상 작성으로 본다."""
    hours = 24 if shift == "주간" else 36
    return datetime.combine(d, time(0, 0), tzinfo=KST) + timedelta(hours=hours)


def is_late(log: Log, created_at: datetime | None) -> bool:
    """CSV 이관 일지(source_seq 있음)와 공지는 판정하지 않는다."""
    if created_at is None or log.source_seq is not None or log.shift_type == NOTICE_SHIFT:
        return False
    return created_at > late_deadline(log.date, log.shift_type)


def missing_shifts(db: Session, days: int = 7) -> list[dict]:
    """근무표에는 있는데 일지가 없는 지난 근무 목록 (최근 → 과거)."""
    today = kst_today()
    date_from = today - timedelta(days=days)
    codes = shift_codes(db, date_from, today - timedelta(days=1))
    logs = db.execute(
        select(Log.date, Log.shift_type).where(
            Log.date >= date_from, Log.date < today, Log.is_deleted.is_(False),
        )
    ).all()
    written = {(d, s) for d, s in logs}
    by_team = team_users(db)
    result = []
    for d in sorted(codes, reverse=True):
        for shift in ("야간", "주간"):
            if (d, shift) in written or (d, "주야") in written:
                continue
            teams = teams_from_code(codes[d], shift)
            workers = [{"user_id": by_team[t].id, "name": by_team[t].name, "team": t, "role": "roster"}
                       for t in teams if t in by_team]
            result.append({"date": d, "shift_type": shift, "team": "·".join(teams), "workers": workers})
    return result
