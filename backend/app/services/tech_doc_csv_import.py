"""관제시스템 문서 CSV 가져오기 — 문서 CSV 와 첨부 CSV 를 따로 올려도 legacy 번호로 연결된다.

이미 있는 문서·첨부는 현재 입력된 내용을 우선해 건너뛰고 사유만 돌려준다.
"""
from __future__ import annotations

import os
import threading

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.tech_doc import TechDoc, TechDocAttachment, TechDocCategory
from app.services import tech_doc_csv_parse as p
from app.services.tech_doc_write_service import _UPLOAD_DIR, _UPLOAD_DIR_LEGACY


def _skip(skipped: list, line: int, key, name, reason: str) -> None:
    skipped.append({"line": line, "key": str(key or "-"), "name": name or "", "reason": reason})


def import_docs(db: Session, raw: bytes, dry_run: bool) -> dict:
    rows = p.read_rows(raw, p.DOC_COLUMNS, "문서")
    existing = {r[0]: r[1] for r in db.execute(text(
        "SELECT legacy_seq, is_deleted FROM skywatch_tech_docs WHERE legacy_seq IS NOT NULL"))}
    seen: set[int] = set()
    skipped: list[dict] = []
    new_docs: list[TechDoc] = []
    for i, row in enumerate(rows, start=2):  # 1행은 머리글
        seq, title = p.clean_int(row.get("seq")), p.clean(row.get("title"))
        if seq is None:
            _skip(skipped, i, row.get("seq"), title, "문서 번호(seq)가 없거나 숫자가 아닙니다"); continue
        if seq in seen:
            _skip(skipped, i, seq, title, "파일 안에 같은 번호가 이미 있습니다"); continue
        seen.add(seq)
        if seq in existing:
            why = "삭제된 문서와 번호가 같습니다" if existing[seq] else "이미 등록된 문서입니다 (현재 입력 내용 유지)"
            _skip(skipped, i, seq, title, why); continue
        data = {
            "legacy_seq": seq, "record_date": p.clean_date(row.get("rdate")),
            "project_code": p.clean(row.get("pcode")), "category_code": p.clean(row.get("ccode")),
            "title": title, "content": p.text_to_html(row.get("content")),
            "summary": row.get("crtf") if p.clean(row.get("crtf")) else None,  # 앞뒤 공백은 원문대로 "detail_summary": p.clean(row.get("crtf_long")),
            "doc_type": p.clean(row.get("gubun")), "adapt_version": p.clean(row.get("adaptVer")),
            "service_date": p.clean_date(row.get("sdate")), "reference": p.clean(row.get("refer")),
            "orig_user_id": p.clean(row.get("userid")),
        }
        if why := p.too_long(data, p.DOC_LIMITS):
            _skip(skipped, i, seq, title, why); continue
        new_docs.append(TechDoc(**data))

    new_cats = sorted({(d.project_code, d.category_code) for d in new_docs if d.project_code and d.category_code}
                      - {(r[0], r[1]) for r in db.execute(text(
                          "SELECT project_code, category_code FROM skywatch_tech_doc_categories"))})
    if not dry_run and new_docs:
        db.add_all(new_docs)
        db.add_all([TechDocCategory(project_code=pc, category_code=cc, name=cc, sort_order=0) for pc, cc in new_cats])
        db.commit()
        _vectorize_later([d.id for d in new_docs])
    return {"total": len(rows), "imported": len(new_docs), "skipped": skipped,
            "new_categories": [f"{pc}/{cc}" for pc, cc in new_cats], "missing_files": []}


def import_attachments(db: Session, raw: bytes, dry_run: bool) -> dict:
    rows = p.read_rows(raw, p.ATTACH_COLUMNS, "첨부")
    doc_map = {r[0]: r[1] for r in db.execute(text(
        "SELECT legacy_seq, id FROM skywatch_tech_docs WHERE legacy_seq IS NOT NULL AND is_deleted = false"))}
    existing = {(r[0], r[1]): r[2] for r in db.execute(text(
        "SELECT legacy_doc_seq, stored_name, is_deleted FROM skywatch_tech_doc_attachments "
        "WHERE legacy_doc_seq IS NOT NULL"))}
    skipped: list[dict] = []
    missing: list[str] = []
    new_atts: list[TechDocAttachment] = []
    for i, row in enumerate(rows, start=2):
        grp, stored = p.clean_int(row.get("filegrpId")), p.clean(row.get("fileName"))
        ori = p.clean(row.get("fileOriName")) or stored
        if grp is None:
            _skip(skipped, i, row.get("filegrpId"), ori, "문서 번호(filegrpId)가 없거나 숫자가 아닙니다"); continue
        if not stored:
            _skip(skipped, i, grp, ori, "저장 파일명(fileName)이 없습니다"); continue
        if not p.safe_file_name(stored):
            _skip(skipped, i, grp, ori, "파일명에 경로가 들어 있어 거부했습니다"); continue
        if grp not in doc_map:
            _skip(skipped, i, grp, ori, "연결할 문서가 없습니다 (문서 CSV 를 먼저 올린 뒤 다시 올리세요)"); continue
        if (grp, stored) in existing:  # 화면에서 지운 첨부도 되살리지 않음
            why = "화면에서 삭제한 첨부입니다" if existing[(grp, stored)] else "이미 등록된 첨부입니다"
            _skip(skipped, i, grp, ori, why); continue
        existing[(grp, stored)] = False
        data = {"tech_doc_id": doc_map[grp], "legacy_doc_seq": grp, "original_name": ori, "stored_name": stored,
                "file_extension": p.clean(row.get("fileExt")) or (os.path.splitext(stored)[1].lstrip(".").lower() or None),
                "content_text": p.clean(row.get("content1")), "reg_date": p.clean_date(row.get("regdate"))}
        if why := p.too_long(data, p.ATTACH_LIMITS):
            _skip(skipped, i, grp, ori, why); continue
        if not any(os.path.isfile(os.path.join(d, stored)) for d in (_UPLOAD_DIR, _UPLOAD_DIR_LEGACY)):
            missing.append(stored)
        new_atts.append(TechDocAttachment(**data))
    if not dry_run and new_atts:
        db.add_all(new_atts)
        db.commit()
        _vectorize_later(sorted({a.tech_doc_id for a in new_atts}))
    return {"total": len(rows), "imported": len(new_atts), "skipped": skipped,
            "new_categories": [], "missing_files": missing}


def _vectorize_later(doc_ids: list[int]) -> None:
    """가져온 문서를 백그라운드 스레드 하나에서 차례로 임베딩 (문서마다 스레드를 띄우지 않음)."""
    if not doc_ids:
        return

    def _run():
        from app.db.session import SessionLocal
        from app.services.tech_doc_vector_service import vectorize_tech_doc
        db = SessionLocal()
        try:
            for doc_id in doc_ids:
                try:
                    vectorize_tech_doc(doc_id, db)
                except Exception as e:  # 한 건 실패가 나머지를 막지 않게
                    db.rollback()
                    print(f"[WARN] TechDoc import vectorize {doc_id} failed: {e}")
        finally:
            db.close()
    threading.Thread(target=_run, daemon=True).start()
