"""근무편성 자료 — skywatch_configs 의 duty_roster(현재)·duty_roster_prev(직전 판) 행에 JSON 하나로 둔다.
저장 형식 {"rev": 서버가 1씩 올리는 정수, "saved_at": ISO 시각, "data": 자료}. 자료 내용(이름)은 로그에 남기지 않는다.
직전 판은 통째 변경(snapshot: 복원·비우기·처음 올리기) 때, 또는 현재 판이 10분 넘게 그대로였을 때만 바뀐다."""
import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.config import Config
from app.services.duty_roster_check import (  # noqa: F401 — api 가 svc.* 로 쓴다
    MAX_BYTES, RosterConflict, RosterInvalid, RosterTooLarge, check_data,
)

CUR_KEY, PREV_KEY = "duty_roster", "duty_roster_prev"
PREV_GAP = timedelta(minutes=10)
_COUNT_KEYS = ("staff", "subs", "uses", "abs")


def _row(db: Session, key: str, lock: bool = False) -> Config | None:
    q = select(Config).where(Config.setting_key == key)
    return db.scalar(q.with_for_update() if lock else q)


def _parse(row: Config | None) -> dict | None:
    try:
        env = json.loads(row.setting_value) if row is not None and row.setting_value else None
    except ValueError:
        return None
    return env if isinstance(env, dict) and isinstance(env.get("data"), dict) else None


def _meta(env: dict | None) -> dict | None:
    if env is None:
        return None
    counts = {k: len(env["data"][k]) if isinstance(env["data"].get(k), list) else 0 for k in _COUNT_KEYS}
    return {"rev": env.get("rev"), "saved_at": env.get("saved_at"), "counts": counts}


def _settled(env: dict | None, now: datetime) -> bool:
    """현재 판이 PREV_GAP 넘게 그대로였나(읽을 수 없으면 True — 남겨 둔다)."""
    try:
        return now - datetime.fromisoformat(env["saved_at"]) >= PREV_GAP
    except (TypeError, KeyError, ValueError):
        return True


def get_roster(db: Session, meta_only: bool = False) -> dict:
    cur = _parse(_row(db, CUR_KEY))
    out = {"exists": cur is not None, **(_meta(cur) or {"rev": None, "saved_at": None, "counts": None}),
           "prev": _meta(_parse(_row(db, PREV_KEY)))}
    if not meta_only:
        out["data"] = cur["data"] if cur else None
    return out


def _write(db: Session, base_rev: int | None, data: dict, snapshot: bool) -> dict:
    """현재 행을 잠그고 판을 비교한 뒤 data 를 새 판으로 쓴다. 규칙에 맞으면 기존 현재 값을 직전 판으로 옮긴다."""
    cur_row = _row(db, CUR_KEY, lock=True)
    cur = _parse(cur_row)
    cur_rev = cur.get("rev") if cur else None
    if base_rev != cur_rev:
        db.rollback()
        raise RosterConflict(cur_rev, cur.get("saved_at") if cur else None)
    now = datetime.now(timezone.utc)
    env = {"rev": (cur_rev or 0) + 1, "saved_at": now.isoformat(), "data": data}
    if cur_row is None:
        cur_row = Config(setting_key=CUR_KEY)
        db.add(cur_row)
    elif cur_row.setting_value and (snapshot or _settled(cur, now)):
        prev_row = _row(db, PREV_KEY, lock=True) or Config(setting_key=PREV_KEY)
        prev_row.setting_value = cur_row.setting_value
        db.add(prev_row)
    cur_row.setting_value = json.dumps(env, ensure_ascii=False)
    try:
        db.commit()
    except IntegrityError:  # 행이 없을 때 두 PC가 동시에 처음 저장
        db.rollback()
        now_env = _parse(_row(db, CUR_KEY)) or {}
        raise RosterConflict(now_env.get("rev"), now_env.get("saved_at"))
    return {"rev": env["rev"], "saved_at": env["saved_at"], "prev": _meta(_parse(_row(db, PREV_KEY)))}


def save_roster(db: Session, base_rev: int | None, data: dict, snapshot: bool = False) -> dict:
    check_data(data)
    return _write(db, base_rev, data, snapshot)


def restore_prev(db: Session, base_rev: int | None) -> dict:
    prev = _parse(_row(db, PREV_KEY))
    if prev is None:
        raise RosterInvalid("되돌릴 직전 판이 없습니다.")
    return {**_write(db, base_rev, prev["data"], snapshot=True), "data": prev["data"]}
