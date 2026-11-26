"""가져오기용 표 파일(CSV / 엑셀 .xlsx) 을 머리글 기준 dict 목록으로 읽는다."""
from __future__ import annotations

import csv
import io

csv.field_size_limit(10 * 1024 * 1024)  # 본문 칸이 매우 길 수 있음

MAX_TABLE_FILE_SIZE = 50 * 1024 * 1024


class TableFormatError(ValueError):
    """올린 파일이 기대한 형식이 아님."""


def _csv_text(raw: bytes) -> str:
    for enc in ("utf-8-sig", "cp949"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    raise TableFormatError("글자 인코딩을 읽을 수 없습니다 (UTF-8 또는 CP949 로 저장하세요).")


def _xlsx_rows(raw: bytes) -> tuple[list[str], list[dict]]:
    from openpyxl import load_workbook
    try:
        ws = load_workbook(io.BytesIO(raw), read_only=True, data_only=True).worksheets[0]
    except Exception:
        raise TableFormatError("엑셀 파일을 열 수 없습니다.")
    it = ws.iter_rows(values_only=True)
    head = [str(h).strip() if h is not None else "" for h in next(it, [])]
    rows = []
    for values in it:
        if values is None or all(v is None for v in values):
            continue
        rows.append({h: ("" if v is None else str(v)) for h, v in zip(head, values) if h})
    return head, rows


def read_rows(raw: bytes, required: set[str], kind: str) -> list[dict]:
    """첫 행을 머리글로 읽고, 필요한 열이 없으면 TableFormatError."""
    if len(raw) > MAX_TABLE_FILE_SIZE:
        raise TableFormatError("파일이 너무 큽니다 (최대 50MB).")
    if raw[:2] == b"PK":  # xlsx(zip)
        head, rows = _xlsx_rows(raw)
    else:
        reader = csv.DictReader(io.StringIO(_csv_text(raw), newline=""))
        head, rows = list(reader.fieldnames or []), list(reader)
    missing = required - set(head)
    if missing:
        raise TableFormatError(f"{kind} 파일 형식이 아닙니다. 필요한 열: {', '.join(sorted(missing))}")
    return rows
