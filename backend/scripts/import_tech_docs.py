"""기록문서 CSV 마이그레이션 스크립트.

사용법:
    python scripts/import_tech_docs.py --mode docs
    python scripts/import_tech_docs.py --mode all

CSV 경로: 이 스크립트 기준 ../../../../data/ 또는 --csv-dir 옵션으로 지정
"""
from __future__ import annotations

import argparse
import csv
import os
import sys
from datetime import datetime

# 프로젝트 루트를 path에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("PGCLIENTENCODING", "UTF8")

from sqlalchemy import text
from app.db.session import SessionLocal
from app.models.tech_doc import TechDoc, TechDocCategory

_NULL_VALUES = {"NULL", "", "null", "None", "none"}


def clean(val) -> str | None:
    s = str(val).strip() if val is not None else ""
    return None if s in _NULL_VALUES else s


def text_to_html(val) -> str | None:
    """평문 content를 TipTap HTML 형식으로 변환. 이미 HTML이면 그대로 반환."""
    if not val:
        return None
    s = str(val)
    if s.strip().startswith('<'):
        return s
    # CSV 인코딩 과정에서 생긴 \r\r\n 패턴 정규화
    # \r\r\n\r\r\n → 단락 구분, \r\r\n → 줄바꿈
    s = s.replace('\r\r\n\r\r\n', '\n\n').replace('\r\r\n', '\n')
    s = s.replace('\r\n', '\n').replace('\r', '\n')
    paragraphs = s.split('\n\n')
    parts = [f'<p>{para.replace(chr(10), "<br>")}</p>' for para in paragraphs if para.strip()]
    return ''.join(parts) or None


def clean_date(val):
    s = clean(val)
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y%m%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except Exception:
            continue
    return None


def _find_csv(csv_dir: str, filename: str) -> str:
    path = os.path.join(csv_dir, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(f"CSV 파일 없음: {path}")
    return path


def migrate_docs(csv_dir: str) -> None:
    doc_csv = _find_csv(csv_dir, "document_all.csv")
    print(f"[문서] 읽기: {doc_csv}")

    db = SessionLocal()
    try:
        inserted = 0
        updated = 0
        skipped = 0
        category_set: set[tuple[str, str]] = set()

        # 기존 legacy_seq → id 맵
        existing = {row[0]: row[1] for row in db.execute(
            text("SELECT legacy_seq, id FROM skywatch_tech_docs WHERE legacy_seq IS NOT NULL")
        ).fetchall()}

        with open(doc_csv, encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        print(f"[문서] CSV 레코드: {len(rows)}건")

        for row in rows:
            seq_raw = clean(row.get("seq"))
            if not seq_raw:
                skipped += 1
                continue
            try:
                legacy_seq = int(seq_raw)
            except ValueError:
                skipped += 1
                continue

            pcode = clean(row.get("pcode"))
            ccode = clean(row.get("ccode"))
            if pcode and ccode:
                category_set.add((pcode, ccode))

            doc_data = {
                "legacy_seq":     legacy_seq,
                "record_date":    clean_date(row.get("rdate")),
                "project_code":   pcode,
                "category_code":  ccode,
                "title":          clean(row.get("title")),
                "content":        text_to_html(row.get("content")),
                "summary":        row.get("crtf") or None,
                "detail_summary": clean(row.get("crtf_long")),
                "doc_type":       clean(row.get("gubun")),
                "adapt_version":  clean(row.get("adaptVer")),
                "service_date":   clean_date(row.get("sdate")),
                "reference":      clean(row.get("refer")),
                "orig_user_id":   clean(row.get("userid")),
            }

            if legacy_seq in existing:
                doc = db.get(TechDoc, existing[legacy_seq])
                if doc:
                    for k, v in doc_data.items():
                        setattr(doc, k, v)
                    updated += 1
            else:
                doc = TechDoc(**doc_data)
                db.add(doc)
                inserted += 1

            if (inserted + updated) % 200 == 0:
                db.commit()
                print(f"  ... {inserted + updated}건 처리 중")

        db.commit()
        print(f"[docs] done: inserted={inserted}, updated={updated}, skipped={skipped}")

        # 카테고리 자동 생성
        cat_inserted = 0
        for pcode, ccode in sorted(category_set):
            exists = db.execute(text(
                "SELECT 1 FROM skywatch_tech_doc_categories WHERE project_code=:p AND category_code=:c"
            ), {"p": pcode, "c": ccode}).fetchone()
            if not exists:
                db.add(TechDocCategory(
                    project_code=pcode,
                    category_code=ccode,
                    name=ccode,
                    sort_order=0,
                ))
                cat_inserted += 1
        db.commit()
        print(f"[카테고리] 자동 생성: {cat_inserted}건")

    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="기록문서 CSV 마이그레이션")
    parser.add_argument("--mode", choices=["docs", "all"], default="all")
    parser.add_argument(
        "--csv-dir",
        default=os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "data"),
    )
    args = parser.parse_args()

    csv_dir = os.path.abspath(args.csv_dir)
    print(f"CSV 디렉토리: {csv_dir}")

    if args.mode in ("docs", "all"):
        migrate_docs(csv_dir)

    print("\n마이그레이션 완료.")


if __name__ == "__main__":
    main()
