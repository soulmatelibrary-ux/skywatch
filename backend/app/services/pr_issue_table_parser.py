"""기준 엑셀의 '이슈 번호 / 문제 내용 / 수정 내용' 표를 PR 번호별로 추출 (DB 접근 없음).

번호 칸이 빈 행은 바로 앞 PR 의 이어지는 내용이다 (수정 내용이 여러 행에 나뉘어 적힌 경우).
"""
import re
from dataclasses import dataclass

_PR_NO = re.compile(r"[A-Z]{1,5}-\d{3,}(?:-\d{3,})*", re.I)
_NO_LABELS = {"이슈번호", "pr번호", "prno", "issueno"}
_TITLE_LABELS = {"문제내용", "제목", "title"}
_FIX_LABELS = {"수정내용", "조치내용", "fix"}


@dataclass
class IssueRow:
    title: str = ""
    fix: str = ""


def _norm(value) -> str:
    return re.sub(r"[\s:]", "", str(value or "")).casefold()


def _cell(row: tuple, index: int | None) -> str:
    if index is None or index >= len(row) or row[index] is None:
        return ""
    return str(row[index]).strip()


def _find_header(rows: list[tuple]) -> tuple[int, int, int | None, int | None] | None:
    """(헤더 행, 번호 열, 문제 내용 열, 수정 내용 열). 번호 열과 수정 내용 열이 모두 있어야 한다."""
    for r, row in enumerate(rows):
        labels = {_norm(v): c for c, v in enumerate(row) if v is not None}
        no = next((labels[x] for x in _NO_LABELS if x in labels), None)
        fix = next((labels[x] for x in _FIX_LABELS if x in labels), None)
        if no is not None and fix is not None:
            return r, no, next((labels[x] for x in _TITLE_LABELS if x in labels), None), fix
    return None


def _append(current: str, extra: str) -> str:
    return f"{current}\n{extra}" if current and extra else current or extra


def parse_issue_table(rows: list[tuple]) -> dict[str, IssueRow]:
    header = _find_header(rows)
    if header is None:
        return {}
    start, no_col, title_col, fix_col = header
    found: dict[str, IssueRow] = {}
    current: IssueRow | None = None
    for row in rows[start + 1:]:
        code = _cell(row, no_col)
        title, fix = _cell(row, title_col), _cell(row, fix_col)
        if code:
            key = code.upper()
            if not _PR_NO.fullmatch(key) or key in found:
                current = None  # 번호가 아닌 줄(합계·주석)이나 중복 번호는 이어붙이지 않는다
                continue
            current = found[key] = IssueRow(title=title, fix=fix)
        elif current is not None:
            current.title = _append(current.title, title)
            current.fix = _append(current.fix, fix)
    return found
