"""skywatch_configs 한 행에 JSON 자료 하나를 판 번호(rev)와 함께 두는 공용 저장소.
저장 형식 {"rev": 서버가 1씩 올리는 정수, "saved_at": ISO 시각, "data": 자료}.
판이 다르면 저장하지 않는다(DocConflict). 자료 내용은 로그에 남기지 않는다.
(근무편성 duty_roster_service 도 같은 규칙이다 — 다음 정리 때 이 저장소로 옮길 후보.)"""
import json
from datetime import datetime, timezone
from typing import Callable

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.config import Config


class DocConflict(Exception):
    """다른 근무자가 먼저 저장해 서버 판이 달라졌다."""
    def __init__(self, rev: int | None, saved_at: str | None):
        super().__init__("conflict")
        self.rev, self.saved_at = rev, saved_at


class DocInvalid(ValueError):
    """자료 형식이 틀렸다."""


class DocTooLarge(DocInvalid):
    """크기 상한 초과."""


Check = Callable[[object], None]


def _row(db: Session, key: str, lock: bool = False) -> Config | None:
    q = select(Config).where(Config.setting_key == key)
    return db.scalar(q.with_for_update() if lock else q)


def _envelope(row: Config | None) -> dict | None:
    """행의 겉봉투를 읽는다. 읽을 수 없으면 None(자료 손상)."""
    try:
        env = json.loads(row.setting_value) if row is not None and row.setting_value else None
    except ValueError:
        return None
    return env if isinstance(env, dict) else None


def _rev(env: dict | None) -> int | None:
    rev = env.get("rev") if env else None
    return rev if isinstance(rev, int) and not isinstance(rev, bool) else None


def read(db: Session, key: str, check: Check) -> dict:
    """{exists, corrupt, rev, saved_at, data}. 손상(겉봉투·형식 검사 실패)이면 data 는 None."""
    row = _row(db, key)
    if row is None:
        return {"exists": False, "corrupt": False, "rev": None, "saved_at": None, "data": None}
    env = _envelope(row)
    data = env.get("data") if env else None
    try:
        check(data)
    except DocInvalid:
        data = None
    saved_at = env.get("saved_at") if env and isinstance(env.get("saved_at"), str) else None
    return {"exists": True, "corrupt": data is None, "rev": _rev(env), "saved_at": saved_at, "data": data}


def write(db: Session, key: str, base_rev: int | None, data: object, check: Check, max_bytes: int) -> dict:
    """형식·크기를 검사하고, 행을 잠가 판을 비교한 뒤 새 판으로 쓴다."""
    if len(json.dumps(data, separators=(",", ":"), ensure_ascii=False).encode("utf-8")) > max_bytes:
        raise DocTooLarge("자료가 너무 큽니다.")
    check(data)
    row = _row(db, key, lock=True)
    env = _envelope(row)
    cur_rev = _rev(env)
    if base_rev != cur_rev:
        db.rollback()
        raise DocConflict(cur_rev, env.get("saved_at") if env else None)
    new = {"rev": (cur_rev or 0) + 1, "saved_at": datetime.now(timezone.utc).isoformat(), "data": data}
    if row is None:
        row = Config(setting_key=key)
        db.add(row)
    row.setting_value = json.dumps(new, ensure_ascii=False)
    try:
        db.commit()
    except IntegrityError:  # 행이 없을 때 두 PC가 동시에 처음 저장
        db.rollback()
        now_env = _envelope(_row(db, key)) or {}
        raise DocConflict(_rev(now_env), now_env.get("saved_at"))
    return {"rev": new["rev"], "saved_at": new["saved_at"]}
