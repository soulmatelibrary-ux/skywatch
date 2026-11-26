"""통근비 계산기(commute-calc.html) 설정·고친 칸 — skywatch_configs 의 commute_calc 행 하나(직전 판 없음).
올린 ERP 엑셀 원본(rows·raw·rawEdits·fileName)은 받지 않는다: 아래 12개 칸만, 정해진 모양일 때만 저장한다.
화면 validData() 와 같은 규칙이다(어긋나면 화면이 '읽을 수 없음'으로 막는다)."""
import re

from sqlalchemy.orm import Session

from app.services import config_doc_store as store
from app.services.config_doc_store import DocConflict, DocInvalid, DocTooLarge  # noqa: F401 — api 가 svc.* 로 쓴다

KEY = "commute_calc"
MAX_BYTES = 5 * 1024 * 1024
KEYS = {"title", "abbr", "roster", "payByCode", "annual", "holAdd", "holDel", "holidayNoPay",
        "overrides", "order", "extra", "removed"}
_YM = re.compile(r"[0-9]{4}-[0-9]{1,2}")
_DATE = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}")


def _str(v) -> bool:
    return isinstance(v, str)


def _pair_list(v) -> bool:
    return isinstance(v, list) and all(isinstance(p, list) and len(p) == 2 and all(map(_str, p)) for p in v)


def _people(v, fields: set) -> bool:
    return isinstance(v, list) and all(
        isinstance(p, dict) and set(p) <= fields and all(map(_str, p.values())) for p in v)


def _bit(v) -> bool:
    return v in (0, 1) and not isinstance(v, bool)


def _cell(k, v) -> bool:
    """고친 칸 하나: '이름|일' → {code?, pay?}, '이름|__type' → 문자열, '이름|__skip' → true."""
    if not _str(k) or "|" not in k:
        return False
    if isinstance(v, dict):
        return set(v) <= {"code", "pay"} and _str(v.get("code", "")) and ("pay" not in v or _bit(v["pay"]))
    return _str(v) or v is True


def _by_month(v, ok) -> bool:
    return isinstance(v, dict) and all(_YM.fullmatch(str(k)) and ok(x) for k, x in v.items())


def check_data(d: object) -> None:
    ok = (
        isinstance(d, dict) and set(d) == KEYS
        and _str(d["title"]) and len(d["title"]) <= 200
        and _pair_list(d["abbr"]) and _pair_list(d["annual"])
        and _people(d["roster"], {"name", "type", "empNo"})
        and isinstance(d["payByCode"], dict) and all(_bit(x) for x in d["payByCode"].values())
        and isinstance(d["holAdd"], dict) and all(_DATE.fullmatch(k) and _str(x) for k, x in d["holAdd"].items())
        and isinstance(d["holDel"], dict) and all(_DATE.fullmatch(k) and x is True for k, x in d["holDel"].items())
        and isinstance(d["holidayNoPay"], bool)
        and _by_month(d["overrides"], lambda b: isinstance(b, dict) and all(_cell(k, x) for k, x in b.items()))
        and _by_month(d["order"], lambda a: isinstance(a, list) and all(map(_str, a)))
        and _by_month(d["removed"], lambda a: isinstance(a, list) and all(map(_str, a)))
        and _by_month(d["extra"], lambda a: _people(a, {"name", "type"}))
    )
    if not ok:
        raise DocInvalid("통근비 계산기 자료 형식이 올바르지 않습니다.")


def get_calc(db: Session) -> dict:
    return store.read(db, KEY, check_data)


def save_calc(db: Session, base_rev: int | None, data: dict) -> dict:
    return store.write(db, KEY, base_rev, data, check_data, MAX_BYTES)
