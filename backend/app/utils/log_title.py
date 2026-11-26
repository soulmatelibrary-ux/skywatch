"""로그 제목 자동 생성 유틸.

형식: [YYYY-MM-DD] {팀명} {근무유형}
특수 케이스:
  - 야간 → [날짜] {팀} 야간
  - 대체 근무자 → sub_for 정보 포함
"""
from datetime import date


def generate_log_title(log_date: date, team: str, shift_type: str) -> str:
    date_str = log_date.strftime("%Y-%m-%d")
    return f"[{date_str}] {team}조 {shift_type}"


def generate_log_title_with_sub(
    log_date: date, team: str, shift_type: str, sub_name: str | None = None
) -> str:
    base = generate_log_title(log_date, team, shift_type)
    if sub_name:
        return f"{base} (대체: {sub_name})"
    return base
