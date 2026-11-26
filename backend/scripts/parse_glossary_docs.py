"""DB 내 약어정리 문서 파싱 스크립트.

사용법:
    python scripts/parse_glossary_docs.py --doc-id 2814 --out glossary_candidates.csv
    python scripts/parse_glossary_docs.py --all --out glossary_candidates.csv

동작:
    1. tech_docs.id=2814 (또는 --all 로 제목에 '약어' 포함 문서 전체) content 로드
    2. HTML 표 또는 반복 단락에서 [약어, 원어, 설명] 파싱
    3. 파싱 결과를 동의어 그룹 초안 CSV로 저장 (사람 검수용)
"""
from __future__ import annotations

import argparse
import csv
import os
import re
import sys
from html.parser import HTMLParser

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("PGCLIENTENCODING", "UTF8")

from sqlalchemy import text

from app.db.session import SessionLocal


# ── HTML 파서: <table> 행/셀 추출 ──────────────────────────────────────────

class _TableParser(HTMLParser):
    """HTML <table> 에서 셀 텍스트를 행 단위로 수집."""

    def __init__(self):
        super().__init__()
        self.rows: list[list[str]] = []
        self._cur_row: list[str] = []
        self._cur_cell: list[str] = []
        self._in_cell = False

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self._cur_row = []
        elif tag in ("td", "th"):
            self._in_cell = True
            self._cur_cell = []

    def handle_endtag(self, tag):
        if tag in ("td", "th"):
            self._in_cell = False
            self._cur_row.append("".join(self._cur_cell).strip())
        elif tag == "tr":
            if any(self._cur_row):
                self.rows.append(self._cur_row)
            self._cur_row = []

    def handle_data(self, data):
        if self._in_cell:
            self._cur_cell.append(data)


def _strip_tags(html: str) -> str:
    return re.sub(r"<[^>]+>", " ", html).strip()


def parse_table_rows(content: str) -> list[list[str]]:
    """<table> 파싱 시도. 실패하면 단락 기반 폴백."""
    if "<table" in content.lower():
        parser = _TableParser()
        parser.feed(content)
        if parser.rows:
            return parser.rows

    # 폴백: 줄바꿈 또는 <br>/<p> 경계로 텍스트 분리 후 2~3열 그룹으로 묶음
    # TipTap HTML은 <p>...</p> 단위가 각 셀에 해당할 수 있음
    normalized = re.sub(r"<br\s*/?>", "\n", content, flags=re.IGNORECASE)
    cells = [_strip_tags(c).strip() for c in re.split(r"</?p[^>]*>|\n", normalized)]
    cells = [c for c in cells if c]
    rows = []
    i = 0
    while i < len(cells):
        # 약어처럼 보이는 셀을 행 시작으로 간주
        if looks_like_acronym(cells[i]):
            chunk = cells[i : i + 3]
            rows.append(chunk)
            i += len(chunk)
        else:
            i += 1
    return rows


def looks_like_acronym(text: str) -> bool:
    """약어처럼 보이는지 간단 판별 (짧고 대문자/한글 혼합)."""
    t = text.strip()
    if not t or len(t) > 20:
        return False
    return bool(re.match(r'^[A-Z0-9\-/]{1,10}$', t) or len(t) <= 8)


# ── 메인 ───────────────────────────────────────────────────────────────────

def fetch_docs(db, doc_id: int | None, all_glossary: bool) -> list[tuple[int, str, str]]:
    """(id, title, content) 목록 반환."""
    if doc_id:
        rows = db.execute(
            text("SELECT id, title, content FROM skywatch_tech_docs WHERE id = :id"),
            {"id": doc_id},
        ).fetchall()
        return [(r[0], r[1] or "", r[2] or "") for r in rows]

    if all_glossary:
        rows = db.execute(
            text(
                "SELECT id, title, content FROM skywatch_tech_docs"
                " WHERE (title ILIKE '%약어%' OR title ILIKE '%glossary%' OR title ILIKE '%용어%')"
                "   AND content IS NOT NULL ORDER BY id"
            )
        ).fetchall()
        return [(r[0], r[1] or "", r[2] or "") for r in rows]

    return []


def parse_doc(doc_id: int, title: str, content: str) -> list[dict]:
    """문서 하나를 파싱해 동의어 후보 레코드 목록으로 변환."""
    rows = parse_table_rows(content)
    records = []
    for row in rows:
        if len(row) < 2:
            continue
        acronym = row[0].strip()
        fullname = row[1].strip() if len(row) > 1 else ""
        desc = row[2].strip() if len(row) > 2 else ""

        # 헤더 행 스킵 (약어, 원어, 설명 등)
        if acronym in ("약어", "Acronym", "원어", "Full Name", "설명", "Description", ""):
            continue

        if not acronym or not fullname:
            continue

        synonyms = ", ".join(filter(None, [acronym, fullname, desc[:40] if desc else ""]))
        records.append({
            "doc_id": doc_id,
            "doc_title": title,
            "acronym": acronym,
            "fullname": fullname,
            "description": desc[:80],
            "synonym_group": synonyms,
            "include": "",  # 검수자: O=포함 / X=제외
        })
    return records


def main() -> None:
    parser = argparse.ArgumentParser(description="약어정리 문서 파싱")
    parser.add_argument("--doc-id", type=int, default=2814, help="tech_docs.id (기본값: 2814)")
    parser.add_argument("--all", action="store_true", dest="all_glossary",
                        help="제목에 '약어/용어' 포함 문서 전체 파싱")
    parser.add_argument("--out", default="glossary_candidates.csv")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        docs = fetch_docs(db, args.doc_id if not args.all_glossary else None, args.all_glossary)
    finally:
        db.close()

    if not docs:
        print("[ERROR] 대상 문서 없음")
        return

    print(f"[INFO] {len(docs)}개 문서 파싱 중...")

    all_records: list[dict] = []
    for doc_id, title, content in docs:
        records = parse_doc(doc_id, title, content)
        print(f"  doc_id={doc_id} '{title[:40]}' → {len(records)}개 파싱")
        all_records.extend(records)

    fieldnames = ["doc_id", "doc_title", "acronym", "fullname", "description", "synonym_group", "include"]
    with open(args.out, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_records)

    print(f"\n[DONE] {len(all_records)}개 행 → {args.out}")
    print("'include' 열에 O/X 표시 후 domain_synonyms.json에 반영하세요.")


if __name__ == "__main__":
    main()
