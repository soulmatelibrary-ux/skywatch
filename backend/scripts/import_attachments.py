"""첨부파일 CSV 마이그레이션 스크립트.

사용법 (skywatch/backend 폴더에서):
    python scripts/import_attachments.py
    python scripts/import_attachments.py --csv-dir C:/path/to/data
    python scripts/import_attachments.py --dry-run   # 실제 입력 없이 통계만 출력

CSV 컬럼:
    filegrpId   - tech_docs.legacy_seq 와 연결되는 문서 ID
    fileOriName - 사용자에게 보여줄 원본 파일명
    fileName    - uploads/tech_docs/ 폴더에 저장된 실제 파일명
    fileExt     - 파일 확장자
    content1    - 텍스트 본문 (주로 NULL)
    regdate     - 등록일 (주로 NULL)
"""
from __future__ import annotations

import argparse
import csv
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# content1 컬럼이 매우 클 수 있으므로 한도 제거
csv.field_size_limit(10 * 1024 * 1024)  # 10MB

from sqlalchemy import text
from app.db.session import SessionLocal
from app.models.tech_doc import TechDocAttachment

_NULL_VALUES = {"NULL", "", "null", "None", "none"}


def clean(val) -> str | None:
    s = str(val).strip() if val is not None else ""
    return None if s in _NULL_VALUES else s


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


def _ext_from_name(filename: str) -> str | None:
    _, dot_ext = os.path.splitext(filename)
    ext = dot_ext.lstrip(".")
    return ext.lower() if ext else None


def migrate_attachments(csv_dir: str, dry_run: bool = False) -> None:
    csv_path = os.path.join(csv_dir, "attachfile.csv")
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV 파일 없음: {csv_path}")
    print(f"[첨부파일] 읽기: {csv_path}")

    db = SessionLocal()
    try:
        # legacy_seq -> tech_doc_id 맵 구축
        doc_map: dict[int, int] = {
            row[0]: row[1]
            for row in db.execute(
                text("SELECT legacy_seq, id FROM skywatch_tech_docs "
                     "WHERE legacy_seq IS NOT NULL AND is_deleted = false")
            ).fetchall()
        }
        print(f"[문서] legacy_seq 보유 문서: {len(doc_map)}건")

        # 이미 입력된 (legacy_doc_seq, stored_name) 쌍 → 중복 방지
        existing: set[tuple[int, str]] = set(
            (row[0], row[1])
            for row in db.execute(
                text("SELECT legacy_doc_seq, stored_name FROM skywatch_tech_doc_attachments "
                     "WHERE legacy_doc_seq IS NOT NULL")
            ).fetchall()
        )
        print(f"[첨부파일] 기존 레코드: {len(existing)}건")

        with open(csv_path, encoding="utf-8", newline="") as f:
            rows = list(csv.DictReader(f))
        print(f"[CSV] 총 {len(rows)}행")

        inserted = 0
        skip_dup = 0
        skip_no_doc = 0
        skip_no_file = 0

        batch: list[TechDocAttachment] = []

        for row in rows:
            raw_grp = clean(row.get("filegrpId"))
            if not raw_grp:
                skip_no_doc += 1
                continue
            try:
                filegrp_id = int(raw_grp)
            except ValueError:
                skip_no_doc += 1
                continue

            doc_id = doc_map.get(filegrp_id)
            if doc_id is None:
                skip_no_doc += 1
                continue

            file_name = clean(row.get("fileName"))
            if not file_name:
                skip_no_file += 1
                continue

            if (filegrp_id, file_name) in existing:
                skip_dup += 1
                continue

            ori_name = clean(row.get("fileOriName")) or file_name
            ext = clean(row.get("fileExt")) or _ext_from_name(file_name)
            content_text = clean(row.get("content1"))
            reg_date = clean_date(row.get("regdate"))

            inserted += 1

            if not dry_run:
                batch.append(TechDocAttachment(
                    tech_doc_id=doc_id,
                    legacy_doc_seq=filegrp_id,
                    original_name=ori_name,
                    stored_name=file_name,
                    file_extension=ext,
                    content_text=content_text,
                    reg_date=reg_date,
                ))
                existing.add((filegrp_id, file_name))

                if len(batch) >= 500:
                    db.add_all(batch)
                    db.commit()
                    batch.clear()
                    print(f"  ... {inserted}건 입력 중")

        if not dry_run and batch:
            db.add_all(batch)
            db.commit()

        print(f"\n{'[DRY-RUN] ' if dry_run else ''}완료:")
        print(f"  입력: {inserted}건")
        print(f"  중복 스킵: {skip_dup}건")
        print(f"  문서 없음 스킵: {skip_no_doc}건")
        print(f"  파일명 없음 스킵: {skip_no_file}건")

    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="첨부파일 CSV 마이그레이션")
    parser.add_argument(
        "--csv-dir",
        default=os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "data"),
    )
    parser.add_argument("--dry-run", action="store_true", help="DB 입력 없이 통계만 출력")
    args = parser.parse_args()

    csv_dir = os.path.abspath(args.csv_dir)
    print(f"CSV 디렉토리: {csv_dir}")
    migrate_attachments(csv_dir, dry_run=args.dry_run)
    print("\n마이그레이션 완료.")


if __name__ == "__main__":
    main()
