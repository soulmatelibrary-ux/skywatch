"""근무편성 자료 저장 전 형식·크기 검사와 오류 종류. 화면(duty-roster.html validateBackup)과 어긋나지 않게 배열 칸만 본다."""
import json

MAX_BYTES = 20 * 1024 * 1024
_LIST_KEYS = ("staff", "subs", "uses", "abs", "asg", "leaves", "swaps", "grants")


class RosterConflict(Exception):
    """다른 근무자가 먼저 저장해 서버 판이 달라졌다."""
    def __init__(self, rev: int | None, saved_at: str | None):
        super().__init__("conflict")
        self.rev, self.saved_at = rev, saved_at


class RosterInvalid(ValueError):
    """자료 형식이 틀렸거나 되돌릴 판이 없다."""


class RosterTooLarge(RosterInvalid):
    """크기 상한(MAX_BYTES) 초과."""


def check_data(data: object) -> None:
    """staff 는 필수 배열, 나머지 기록 칸은 있으면 배열이어야 한다."""
    if (not isinstance(data, dict) or not isinstance(data.get("staff"), list)
            or any(k in data and not isinstance(data[k], list) for k in _LIST_KEYS)):
        raise RosterInvalid("근무편성 자료 형식이 올바르지 않습니다.")
    if len(json.dumps(data, ensure_ascii=False).encode("utf-8")) > MAX_BYTES:
        raise RosterTooLarge("근무편성 자료가 너무 큽니다.")
