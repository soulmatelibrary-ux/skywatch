"""관제시스템 문서 CSV(document_*.csv / attachfile_*.csv) 해석 도우미 — 업무일지 가져오기도 같이 쓴다."""
from __future__ import annotations

import os
from datetime import datetime

# 파일 읽기는 공용 모듈 (CSV·엑셀). 기존 이름으로도 쓸 수 있게 다시 내보낸다.
from app.services.table_file_reader import MAX_TABLE_FILE_SIZE as MAX_CSV_SIZE  # noqa: F401
from app.services.table_file_reader import TableFormatError as CsvFormatError  # noqa: F401
from app.services.table_file_reader import read_rows  # noqa: F401

DOC_COLUMNS = {"seq", "title"}
ATTACH_COLUMNS = {"filegrpId", "fileName"}
_NULL_VALUES = {"NULL", "", "null", "None", "none"}

# 컬럼 길이 (models/tech_doc.py 와 같게)
DOC_LIMITS = {"title": 500, "project_code": 30, "category_code": 20, "doc_type": 100,
              "adapt_version": 50, "orig_user_id": 20}
ATTACH_LIMITS = {"original_name": 500, "stored_name": 500, "file_extension": 20}


def clean(val) -> str | None:
    s = str(val).strip() if val is not None else ""
    return None if s in _NULL_VALUES else s


def clean_int(val) -> int | None:
    s = clean(val)
    try:
        return int(float(s)) if s else None  # 엑셀 숫자 칸은 "7960.0" 으로 올 수 있음
    except ValueError:
        return None


def clean_date(val):
    s = clean(val)
    if not s:
        return None
    s = s[:10]  # "2026-07-07 14:29:45" 처럼 시각이 붙은 값
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y%m%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def text_to_html(val) -> str | None:
    """평문 content 를 편집기 HTML 로. 이미 HTML 이면 그대로 (import_tech_docs.py 와 같은 규칙)."""
    if not val:
        return None
    s = str(val)
    if s.strip().startswith('<'):
        return s
    s = s.replace('\r\r\n\r\r\n', '\n\n').replace('\r\r\n', '\n')
    s = s.replace('\r\n', '\n').replace('\r', '\n')
    esc = s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    parts = [f'<p>{p.replace(chr(10), "<br>")}</p>' for p in esc.split('\n\n') if p.strip()]
    return ''.join(parts) or None


def too_long(data: dict, limits: dict[str, int]) -> str | None:
    """길이 초과 칸 이름 (없으면 None)."""
    for key, limit in limits.items():
        if data.get(key) and len(data[key]) > limit:
            return f"{key} 가 {limit}자를 넘습니다"
    return None


def safe_file_name(name: str) -> bool:
    """저장 폴더 밖을 가리키지 않는 순수 파일명인지."""
    return name == os.path.basename(name) and name not in (".", "..") and "/" not in name and "\\" not in name
