"""관제시스템 문서 전체 초기화 후 CSV 재입력 스크립트.

사용법 (skywatch/backend 폴더에서):
    python scripts/reset_and_import_tech_docs.py
    python scripts/reset_and_import_tech_docs.py --csv-dir C:/path/to/data
    python scripts/reset_and_import_tech_docs.py --dry-run

CSV 파일:
    documnet.csv   - 문서 목록 (document)
    attachfile.csv - 첨부파일 목록

기본 CSV 경로: 스크립트 기준 3단계 상위 (SkyWatch/ 루트)
"""
from __future__ import annotations

import argparse
import csv
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

csv.field_size_limit(10 * 1024 * 1024)  # 10MB

from sqlalchemy import text
from app.db.session import SessionLocal
from app.models.tech_doc import TechDoc, TechDocAttachment, TechDocCategory

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


def text_to_html(val) -> str | None:
    if not val:
        return None
    s = str(val)
    if s.strip().startswith('<'):
        return s
    s = s.replace('\r\r\n\r\r\n', '\n\n').replace('\r\r\n', '\n')
    s = s.replace('\r\n', '\n').replace('\r', '\n')
    paragraphs = s.split('\n\n')
    parts = [f'<p>{para.replace(chr(10), "<br>")}</p>' for para in paragraphs if para.strip()]
    return ''.join(parts) or None


def _ext_from_name(filename: str) -> str | None:
    _, dot_ext = os.path.splitext(filename)
    ext = dot_ext.lstrip(".")
    return ext.lower() if ext else None


def clear_tables(db, dry_run: bool) -> None:
    print("[초기화] 기존 데이터 삭제 중...")
    if dry_run:
        for tbl in ("skywatch_tech_doc_vectors", "skywatch_tech_doc_attachments", "skywatch_tech_docs", "skywatch_tech_doc_categories"):
            cnt = db.execute(text(f"SELECT COUNT(*) FROM {tbl}")).scalar()
            print(f"  [DRY-RUN] {tbl}: {cnt}건 삭제 예정")
        return

    db.execute(text("TRUNCATE skywatch_tech_doc_vectors, skywatch_tech_doc_attachments, skywatch_tech_docs, skywatch_tech_doc_categories RESTART IDENTITY CASCADE"))
    db.commit()
    print("[초기화] 완료.")


def import_docs(db, csv_path: str, dry_run: bool) -> dict[int, int]:
    """문서 CSV 입력. {legacy_seq: doc_id} 맵 반환."""
    print(f"[문서] 읽기: {csv_path}")

    with open(csv_path, encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    print(f"[문서] CSV 레코드: {len(rows)}건")

    inserted = 0
    skipped = 0
    category_set: set[tuple[str, str]] = set()
    legacy_map: dict[int, int] = {}

    batch: list[TechDoc] = []

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
            "summary":        clean(row.get("crtf")),
            "detail_summary": clean(row.get("crtf_long")),
            "doc_type":       clean(row.get("gubun")),
            "adapt_version":  clean(row.get("adaptVer")),
            "service_date":   clean_date(row.get("sdate")),
            "reference":      clean(row.get("refer")),
            "orig_user_id":   clean(row.get("userid")),
        }

        inserted += 1

        if not dry_run:
            doc = TechDoc(**doc_data)
            batch.append(doc)

            if len(batch) >= 500:
                db.add_all(batch)
                db.flush()
                for d in batch:
                    legacy_map[d.legacy_seq] = d.id
                db.commit()
                batch.clear()
                print(f"  ... {inserted}건 처리 중")

    if not dry_run and batch:
        db.add_all(batch)
        db.flush()
        for d in batch:
            legacy_map[d.legacy_seq] = d.id
        db.commit()

    print(f"[docs] {'[DRY-RUN] ' if dry_run else ''}완료: inserted={inserted}, skipped={skipped}")

    # 카테고리 자동 생성
    if not dry_run:
        cat_inserted = 0
        for pcode, ccode in sorted(category_set):
            db.add(TechDocCategory(
                project_code=pcode,
                category_code=ccode,
                name=ccode,
                sort_order=0,
            ))
            cat_inserted += 1
        db.commit()
        print(f"[카테고리] 자동 생성: {cat_inserted}건")

    return legacy_map


def import_attachments(db, csv_path: str, legacy_map: dict[int, int], dry_run: bool) -> None:
    print(f"[첨부파일] 읽기: {csv_path}")

    with open(csv_path, encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    print(f"[첨부파일] CSV 레코드: {len(rows)}건")

    inserted = 0
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

        doc_id = legacy_map.get(filegrp_id)
        if doc_id is None:
            skip_no_doc += 1
            continue

        file_name = clean(row.get("fileName"))
        if not file_name:
            skip_no_file += 1
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

            if len(batch) >= 500:
                db.add_all(batch)
                db.commit()
                batch.clear()
                print(f"  ... {inserted}건 처리 중")

    if not dry_run and batch:
        db.add_all(batch)
        db.commit()

    print(f"[attachments] {'[DRY-RUN] ' if dry_run else ''}완료: inserted={inserted}, skip_no_doc={skip_no_doc}, skip_no_file={skip_no_file}")


def main():
    parser = argparse.ArgumentParser(description="관제시스템 문서 전체 초기화 후 CSV 재입력")
    parser.add_argument(
        "--csv-dir",
        default=os.path.join(os.path.dirname(__file__), "..", "..", ".."),
        help="CSV 파일이 위치한 폴더 (기본: SkyWatch/ 루트)",
    )
    parser.add_argument("--dry-run", action="store_true", help="DB 변경 없이 통계만 출력")
    args = parser.parse_args()

    csv_dir = os.path.abspath(args.csv_dir)
    print(f"CSV 디렉토리: {csv_dir}")
    print(f"모드: {'DRY-RUN' if args.dry_run else '실제 입력'}\n")

    doc_csv = os.path.join(csv_dir, "documnet.csv")
    att_csv = os.path.join(csv_dir, "attachfile.csv")

    for path in (doc_csv, att_csv):
        if not os.path.exists(path):
            print(f"[오류] 파일 없음: {path}")
            sys.exit(1)

    db = SessionLocal()
    try:
        clear_tables(db, args.dry_run)
        legacy_map = import_docs(db, doc_csv, args.dry_run)
        import_attachments(db, att_csv, legacy_map, args.dry_run)
    finally:
        db.close()

    print("\n마이그레이션 완료.")


if __name__ == "__main__":
    main()
