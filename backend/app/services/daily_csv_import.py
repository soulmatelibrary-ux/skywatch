"""업무일지 CSV·엑셀 가져오기 (관리자 설정 화면). 일지 파일과 첨부 파일을 따로 올려도 seq 로 연결된다.

이미 저장된 일지(같은 seq, 또는 같은 날짜·근무)는 건너뛰고 사유만 돌려준다.
"""
from __future__ import annotations

import mimetypes
from datetime import date

from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.models.log import Log, LogCard, LogRead
from app.models.notification import Notification
from app.models.schedule import Attachment
from app.models.user import User
from app.schemas.log import CardUpsert, LogCreate, ParticipantIn
from app.services import daily_csv_parse as dp
from app.services import tech_doc_csv_parse as p
from app.services.attachment_service import UPLOAD_ROOT
from app.services.log_write_service import create_log

LEGACY_DIR = "legacy"  # 첨부 실제 파일 위치: uploads/legacy/<fileName> (수동 복사)


def _skip(skipped: list, line: int, key, name, reason: str) -> None:
    skipped.append({"line": line, "key": str(key or "-"), "name": name or "", "reason": reason})


def _payload(row: dict, day: date, shift: str, worker_id: int | None) -> LogCreate | None:
    raw = dp.parse_cards(row.get("content") or "")
    if not raw:
        return None
    cards = [CardUpsert(title=c["title"][:255], position=i, category_id=dp.auto_category(c["title"], c["content"] or ""),
                        content=dp.text_to_html(c["content"]) if c["content"] else None) for i, c in enumerate(raw)]
    parts = [ParticipantIn(user_id=worker_id, role="primary")] if worker_id else []
    return LogCreate(date=day, shift_type=shift, title=cards[0].title, cards=cards, participants=parts)


def import_logs(db: Session, raw: bytes, dry_run: bool, admin_id: int) -> dict:
    rows = p.read_rows(raw, dp.DAILY_COLUMNS, "업무일지")
    by_seq = {s: d for s, d in db.execute(select(Log.source_seq, Log.is_deleted).where(Log.source_seq.is_not(None)))}
    taken = {(d, s) for d, s in db.execute(select(Log.date, Log.shift_type).where(Log.is_deleted.is_(False)))}
    users = {u.name: u.id for u in db.scalars(select(User))}
    all_ids = list(users.values())
    seen_seq: set[int] = set()
    seen_shift: set[tuple] = set()  # 이 파일에서 가져올 날짜·근무
    skipped, warnings, done = [], [], 0
    for i, row in enumerate(rows, start=2):
        seq, title, day = p.clean_int(row.get("seq")), (p.clean(row.get("title")) or ""), p.clean_date(row.get("rdate"))
        if seq is None:
            _skip(skipped, i, row.get("seq"), title, "번호(seq)가 없거나 숫자가 아닙니다"); continue
        if seq in seen_seq:
            _skip(skipped, i, seq, title, "파일 안에 같은 번호가 이미 있습니다"); continue
        seen_seq.add(seq)
        if seq in by_seq:
            _skip(skipped, i, seq, title, "삭제된 일지와 번호가 같습니다" if by_seq[seq] else "이미 저장된 일지입니다"); continue
        if day is None:
            _skip(skipped, i, seq, title, "날짜(rdate)를 읽을 수 없습니다"); continue
        shift = dp.shift_type(title, day.year)
        if shift != "공지" and (day, shift) in seen_shift:
            _skip(skipped, i, seq, title, f"파일 안에 {day} {shift} 일지가 이미 있습니다"); continue
        if shift != "공지" and (day, shift) in taken:
            _skip(skipped, i, seq, title, f"{day} {shift} 일지가 이미 있습니다"); continue
        name = dp.worker_name(title)
        worker_id = users.get(name) if name else None
        payload = _payload(row, day, shift, worker_id)
        if payload is None:
            _skip(skipped, i, seq, title, "작업내용(카드)이 없습니다"); continue
        if shift != "공지" and not worker_id:
            warnings.append(f"{i}행 seq {seq}: 근무자 '{name or '-'}' 를 찾지 못해 작성자를 가져온 관리자로 둡니다")
        if shift != "공지":
            seen_shift.add((day, shift))
        if dry_run:
            done += 1; continue
        log_id = None
        try:
            log_id = create_log(db, worker_id or admin_id, payload).id  # create_log 가 일지를 커밋함
            # 지난 일지라 알림('새 일지'·멘션)은 지우고, 모두 읽음·카드 완료로 둔다 (기존 일지와 같게)
            db.execute(delete(Notification).where(Notification.ref_type == "log", Notification.ref_id == log_id))
            db.execute(update(Log).where(Log.id == log_id).values(source_seq=seq))
            db.execute(update(LogCard).where(LogCard.log_id == log_id).values(status="done"))
            db.add_all([LogRead(log_id=log_id, user_id=uid) for uid in all_ids])
            db.commit()
            done += 1
        except Exception as e:  # 한 행 실패가 나머지를 막지 않게
            db.rollback()
            if log_id is not None:  # 일지는 저장됐으나 번호·읽음 처리가 안 됨 → 관리자가 확인
                _skip(skipped, i, seq, title, f"일지 #{log_id} 는 저장됐으나 마무리 처리에 실패했습니다. 확인 필요")
            elif isinstance(e, ValueError):  # DuplicateLogError 포함
                _skip(skipped, i, seq, title, str(e))
            else:
                _skip(skipped, i, seq, title, f"저장 오류: {type(e).__name__}")
            print(f"[WARN] daily import seq={seq} failed: {e}")
    return {"total": len(rows), "imported": done, "skipped": skipped, "warnings": warnings}


def import_attachments(db: Session, raw: bytes, dry_run: bool) -> dict:
    rows = p.read_rows(raw, p.ATTACH_COLUMNS, "업무일지 첨부")
    logs = {s: lid for s, lid in db.execute(select(Log.source_seq, Log.id).where(
        Log.source_seq.is_not(None), Log.is_deleted.is_(False)))}
    # 일지마다 첫 카드(position 최소) — 내림차순으로 덮어써서 마지막 값이 최소가 된다
    first_card: dict[int, int] = {}
    author_of: dict[int, int] = {}  # 카드 id → 일지 작성자
    for lid, cid, author in db.execute(
            select(LogCard.log_id, LogCard.id, Log.author_id).join(Log, Log.id == LogCard.log_id)
            .where(LogCard.is_deleted.is_(False), Log.source_seq.is_not(None), Log.is_deleted.is_(False))
            .order_by(LogCard.log_id, LogCard.position.desc())):
        first_card[lid], author_of[cid] = cid, author
    existing = {(o, f): d for o, f, d in db.execute(select(Attachment.owner_id, Attachment.file_name, Attachment.is_deleted)
                                                    .where(Attachment.owner_type == "card"))}
    skipped, missing, new = [], [], []
    for i, row in enumerate(rows, start=2):
        grp, stored = p.clean_int(row.get("filegrpId")), p.clean(row.get("fileName"))
        ori = p.clean(row.get("fileOriName")) or stored
        if grp is None:
            _skip(skipped, i, row.get("filegrpId"), ori, "일지 번호(filegrpId)가 없거나 숫자가 아닙니다"); continue
        if not stored or not p.safe_file_name(stored):
            _skip(skipped, i, grp, ori, "저장 파일명(fileName)이 없거나 경로가 들어 있습니다"); continue
        card_id = first_card.get(logs.get(grp))
        if card_id is None:
            _skip(skipped, i, grp, ori, "연결할 일지가 없습니다 (일지 파일을 먼저 올린 뒤 다시 올리세요)"); continue
        if (card_id, stored) in existing:
            why = "화면에서 삭제한 첨부입니다" if existing[(card_id, stored)] else "이미 등록된 첨부입니다"
            _skip(skipped, i, grp, ori, why); continue
        if len(stored) > 255 or len(ori) > 255:
            _skip(skipped, i, grp, ori, "파일명이 255자를 넘습니다"); continue
        existing[(card_id, stored)] = False
        disk = UPLOAD_ROOT / LEGACY_DIR / stored
        if not disk.is_file():
            missing.append(stored)
        new.append(Attachment(owner_type="card", owner_id=card_id, original_name=ori, file_name=stored,
                              file_path=f"uploads/{LEGACY_DIR}/{stored}", file_size=disk.stat().st_size if disk.is_file() else 0,
                              mime_type=mimetypes.guess_type(ori)[0], content_text=p.clean(row.get("content1")),
                              uploaded_by=author_of[card_id], is_deleted=False))
    if not dry_run and new:
        db.add_all(new)
        db.commit()
    return {"total": len(rows), "imported": len(new), "skipped": skipped, "missing_files": missing}
