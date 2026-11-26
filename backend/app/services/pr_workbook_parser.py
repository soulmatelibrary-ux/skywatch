"""근무자 '시험 확인서' 엑셀을 양식 항목별로 추출 (DB 접근 없음)."""
import io
import re
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta

from openpyxl import load_workbook

from app.services.pr_issue_table_parser import IssueRow, parse_issue_table

PR_NO_PATTERN = re.compile(r"\b[A-Z]{1,5}-\d{3,}(?:-\d{3,})*\b", re.I)
_EXCEL_EPOCH = datetime(1899, 12, 30)
_KO_DATETIME = re.compile(r"(\d{4})\s*[년.\-/]\s*(\d{1,2})\s*[월.\-/]\s*(\d{1,2})\s*일?\s*(?:(\d{1,2}):(\d{2}))?")


@dataclass
class SheetRecord:
    sheet_name: str
    pr_no: str
    item_kind: str = "개별 PR"
    title: str = ""
    skyline_version: str | None = None
    adaptation_version: str | None = None
    test_segment: str | None = None
    attendees: str | None = None
    tested_on: date | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    verify_method: str | None = None
    result_summary: str | None = None


@dataclass
class ParsedWorkbook:
    catalog: dict[str, str] = field(default_factory=dict)
    records: list[SheetRecord] = field(default_factory=list)
    issues: dict[str, IssueRow] = field(default_factory=dict)  # 첫 시트가 '이슈 번호/문제 내용/수정 내용' 표일 때


def _norm(value) -> str:
    return re.sub(r"[\s:□]", "", str(value or "")).casefold()


_SECTION_LABELS = {_norm(x) for x in ("시험항목", "시험방법", "시험결과", "비고")}


def _text(value) -> str | None:
    if value is None or isinstance(value, (datetime, date)):
        return None
    text = str(value).strip()
    return None if not text or text.startswith("=") or text == "0" else text


def to_datetime(value) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day)
    if isinstance(value, (int, float)) and 20000 < value < 80000:
        return _EXCEL_EPOCH + timedelta(days=float(value))
    match = _KO_DATETIME.search(str(value or ""))
    if not match:
        return None
    y, m, d, hh, mm = match.groups()
    return datetime(int(y), int(m), int(d), int(hh or 0), int(mm or 0))


class _Grid:
    def __init__(self, rows: list[tuple]):
        self.rows = rows

    def _find(self, label: str, last: bool = False) -> tuple[int, int] | None:
        target, hits = _norm(label), []
        for r, row in enumerate(self.rows):
            for c, value in enumerate(row):
                if value is not None and _norm(value) == target:
                    hits.append((r, c))
        return (hits[-1] if last else hits[0]) if hits else None

    def right(self, label: str):
        pos = self._find(label)
        if pos is None:
            return None
        r, c = pos
        return next((v for v in self.rows[r][c + 1:] if v not in (None, "")), None)

    def block(self, label: str, last: bool = False) -> str | None:
        """라벨 아래 행부터 다음 구역 라벨 전까지의 내용을 줄 단위로 모은다 (본문이 비면 None)."""
        pos = self._find(label, last)
        if pos is None:
            return None
        r, c = pos
        lines: list[str] = []
        for row in self.rows[r + 1:]:
            values = [v for v in row[c:] if v not in (None, "")]
            if not values:
                continue
            if _norm(values[0]) in _SECTION_LABELS:
                break
            text = " | ".join(t for t in (_text(v) for v in values) if t)
            if text:
                lines.append(text)
        return "\n".join(lines) or None


def _parse_catalog(rows: list[tuple]) -> dict[str, str]:
    catalog: dict[str, str] = {}
    for row in rows:
        values = [_text(v) or "" for v in row]
        for i, value in enumerate(values):
            match = PR_NO_PATTERN.fullmatch(value) or PR_NO_PATTERN.search(value)
            if match and len(value) <= len(match.group(0)) + 2:
                title = next((v for v in values[i + 1:] if v and not PR_NO_PATTERN.search(v)), "")
                catalog.setdefault(match.group(0).upper(), title)
    return catalog


def _parse_sheet(title: str, rows: list[tuple]) -> SheetRecord | None:
    g = _Grid(rows)
    code = _text(g.right("관련 PR번호")) or ""
    match = PR_NO_PATTERN.search(code) or PR_NO_PATTERN.search(title)
    kind = "개별 PR"
    if match:
        pr_no = match.group(0).upper()
    elif "기본" in title or "basic" in title.lower():
        pr_no, kind = "TEST-BASIC", "기본기능"
    elif "연동" in title or "integration" in title.lower():
        pr_no, kind = "TEST-INTEGRATION", "수정사항 연동"
    else:
        return None
    tested = to_datetime(g.right("시험 일자"))
    return SheetRecord(
        sheet_name=title, pr_no=pr_no, item_kind=kind,
        title=_text(g.right("시험명")) or "",
        skyline_version=_text(g.right("Skyline 버전")),
        adaptation_version=_text(g.right("Adaptation 버전")),
        test_segment=_text(g.right("시험 세그먼트")),
        attendees=_text(g.right("시험 참석자")),
        tested_on=tested.date() if tested else None,
        started_at=to_datetime(g.right("시험 시작 시간")),
        ended_at=to_datetime(g.right("시험 종료 시간")),
        verify_method=g.block("시험방법"),
        result_summary=g.block("시험결과", last=True),
    )


def parse_workbook(content: bytes, keep_vba: bool) -> ParsedWorkbook:
    try:
        wb = load_workbook(io.BytesIO(content), read_only=True, data_only=True, keep_vba=keep_vba)
    except Exception as exc:
        raise ValueError(f"엑셀 파일을 읽지 못했습니다: {exc}") from exc
    try:
        sheets = [(ws.title, list(ws.iter_rows(values_only=True))) for ws in wb.worksheets]
    finally:
        wb.close()
    if not sheets:
        raise ValueError("엑셀에 시트가 없습니다.")
    parsed = ParsedWorkbook(catalog=_parse_catalog(sheets[0][1]), issues=parse_issue_table(sheets[0][1]))
    # 보통 첫 시트는 PR 목록이지만, 단일 시험확인서나 첫 시트부터 검증자료가 시작되는 파일도 허용한다.
    first_is_report = _Grid(sheets[0][1])._find("관련 PR번호") is not None
    for title, rows in sheets[0 if first_is_report else 1:]:
        record = _parse_sheet(title, rows)
        if record:
            parsed.records.append(record)
    return parsed
