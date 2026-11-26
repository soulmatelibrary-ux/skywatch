"""통근비 계산기 달별 근태 자료 — 올린 파일에 든 달만 덮어쓰고 다른 달은 그대로 둔다.
자료 내용(이름 등)은 로그에 남기지 않는다."""
import re

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.commute import CommuteMonth
from app.models.user import User
from app.schemas.commute_calc import CommuteMonthsUpload

MAX_ROWS_PER_MONTH = 20000
_YM = re.compile(r"([0-9]{4})-([0-9]{1,2})")


class MonthInvalid(ValueError):
    """달 이름·건수가 맞지 않는다."""


class MonthBusy(Exception):
    """같은 달을 동시에 처음 저장했다."""


def norm_ym(ym: str) -> str:
    """'2026-1'·'2026-01' → '2026-01'. 형식이 다르면 MonthInvalid."""
    m = _YM.fullmatch(ym or "")
    if not m or not (1990 <= int(m[1]) <= 2100 and 1 <= int(m[2]) <= 12):
        raise MonthInvalid(f"달 형식이 올바르지 않습니다: {ym}")
    return f"{int(m[1]):04d}-{int(m[2]):02d}"


def _meta(row: CommuteMonth, names: dict[int, str]) -> dict:
    return {
        "ym": row.ym, "file_name": row.file_name, "row_count": row.row_count,
        "uploaded_at": row.uploaded_at.isoformat() if row.uploaded_at else None,
        "uploaded_by_name": names.get(row.uploaded_by) if row.uploaded_by else None,
    }


def list_months(db: Session) -> list[dict]:
    """저장된 달 목록(자료 본문 없이), 오래된 달부터."""
    rows = db.execute(
        select(CommuteMonth.ym, CommuteMonth.file_name, CommuteMonth.row_count,
               CommuteMonth.uploaded_at, CommuteMonth.uploaded_by).order_by(CommuteMonth.ym)
    ).all()
    ids = {r.uploaded_by for r in rows if r.uploaded_by}
    names = dict(db.execute(select(User.id, User.name).where(User.id.in_(ids))).all()) if ids else {}
    return [_meta(r, names) for r in rows]


def get_month(db: Session, ym: str) -> dict | None:
    row = db.scalar(select(CommuteMonth).where(CommuteMonth.ym == norm_ym(ym)))
    return None if row is None else {"ym": row.ym, "rows": row.rows}


def save_months(db: Session, body: CommuteMonthsUpload, user_id: int) -> list[str]:
    """파일에 든 달만 덮어쓴다(한 트랜잭션). 저장한 달 목록을 돌려준다."""
    data: dict[str, list[dict]] = {}
    for key, rows in body.months.items():
        ym = norm_ym(key)
        if ym in data:
            raise MonthInvalid(f"같은 달이 두 번 들어 있습니다: {ym}")
        if not rows or len(rows) > MAX_ROWS_PER_MONTH:
            raise MonthInvalid(f"{ym} 자료 건수가 올바르지 않습니다({len(rows)}건).")
        data[ym] = [r.model_dump() for r in rows]
    existing = {r.ym: r for r in db.scalars(
        select(CommuteMonth).where(CommuteMonth.ym.in_(data)).with_for_update())}
    for ym, rows in data.items():
        row = existing.get(ym)
        if row is None:
            row = CommuteMonth(ym=ym)
            db.add(row)
        row.rows, row.row_count, row.file_name = rows, len(rows), body.file_name
        row.uploaded_by, row.uploaded_at = user_id, func.now()
    try:
        db.commit()
    except IntegrityError:   # 두 PC 가 같은 새 달을 동시에 처음 올렸다
        db.rollback()
        raise MonthBusy("다른 근무자가 같은 달을 동시에 올렸습니다. 다시 올려 주십시오.")
    return sorted(data)


def delete_month(db: Session, ym: str) -> bool:
    row = db.scalar(select(CommuteMonth).where(CommuteMonth.ym == norm_ym(ym)))
    if row is None:
        return False
    db.delete(row)
    db.commit()
    return True
