"""엑셀 업로드 반영: 기준 PR 목록 / 근무자 검증 기록 (팝업 입력과 같은 기록에 저장)."""
import hashlib
import uuid
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.issue import Issue
from app.models.pr_batch import PrBatch, PrBatchItem, PrVerification, PrWorkbookImport
from app.models.user import User
from app.services.pr_issue_autocreate import create_from_catalog, vectorize_later
from app.services.pr_verification_service import RECORD_FIELDS, apply_record, remove_files, report_root
from app.services.pr_workbook_parser import parse_workbook

MAX_SIZE = 30 * 1024 * 1024
MAX_PR_NO = 20  # skywatch_pr_batch_items.kac_pr_no 컬럼 길이
MAX_TITLE = 500  # skywatch_pr_batch_items.title 컬럼 길이


async def _read(file: UploadFile) -> tuple[bytes, str, str]:
    name = file.filename or "verification.xlsx"
    suffix = Path(name).suffix.lower()
    if suffix not in {".xlsx", ".xlsm"}:
        raise ValueError(".xlsx 또는 .xlsm 파일을 올려주세요.")
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise ValueError("엑셀 파일은 30MB를 초과할 수 없습니다.")
    return content, name, suffix


def _check_batch(db: Session, batch_id: int) -> PrBatch:
    batch = db.get(PrBatch, batch_id)
    if batch is None or batch.is_deleted:
        raise ValueError("버전 배치를 찾을 수 없습니다.")
    return batch


def report_defaults(batch: PrBatch) -> dict:
    """버전에 적어 둔 보고서 공통값 — 엑셀·입력창에서 비어 있으면 이 값으로 채운다."""
    return {
        "skyline_version": batch.skyline_version or batch.sw_version,
        "adaptation_version": batch.adaptation_version,
        "test_segment": batch.test_segment,
    }


class _Items:
    """배치 PR 항목을 PR번호/검증구분으로 찾고, 없으면 개별 PR 목록과 연결해 생성 (can_create=False면 None)."""

    def __init__(self, db: Session, batch_id: int, can_create: bool = True, new_issue=None):
        """new_issue: (PR번호, 제목) → 개별 PR 에 없을 때 새로 만들어 돌려주는 함수 (없으면 None)."""
        self.db, self.batch_id, self.can_create, self.created = db, batch_id, can_create, 0
        self.new_issue = new_issue
        self.index: dict[str, PrBatchItem] = {}
        items = db.scalars(select(PrBatchItem).where(PrBatchItem.batch_id == batch_id)).all()
        for item in items:
            self._remember(item)
        # 새 항목은 기존 순서의 맨 뒤에 붙인다 (수동 추가 항목과 순서가 겹치거나 뒤바뀌지 않게)
        self.next_order = max((item.sort_order for item in items), default=-1) + 1

    def _remember(self, item: PrBatchItem) -> None:
        for code in (item.kac_pr_no, item.lm_pr_no):
            if code:
                self.index.setdefault(code.strip().upper(), item)
        if item.item_kind != "개별 PR":
            self.index.setdefault(f"kind:{item.item_kind}", item)

    def _existing_for(self, issue: Issue) -> PrBatchItem | None:
        """이 배치에 이미 있는 같은 개별 PR 의 항목 (issue_id 연결, 없으면 개별 PR 의 KAC/제작사 번호와 같은 항목)."""
        for item in self.index.values():
            if item.issue_id == issue.id:
                return item
        for code in (issue.kac_pr_no, issue.lm_pr_no):
            if code and code.strip().upper() in self.index:
                return self.index[code.strip().upper()]
        return None

    def _issue(self, pr_no: str) -> Issue | None:
        return self.db.scalar(select(Issue).where(
            Issue.is_deleted.is_(False),
            or_(func.upper(Issue.kac_pr_no) == pr_no, func.upper(Issue.lm_pr_no) == pr_no),
        ).order_by(Issue.id).limit(1))  # 같은 번호가 여러 개여도 항상 가장 먼저 등록된 PR 로 정한다

    def ensure(self, pr_no: str, title: str, kind: str = "개별 PR") -> PrBatchItem | None:
        item = self.index.get(pr_no) or (self.index.get(f"kind:{kind}") if kind != "개별 PR" else None)
        if item is None and (not self.can_create or len(pr_no) > MAX_PR_NO):
            return None
        issue = self._issue(pr_no) if kind == "개별 PR" else None
        if issue is None and kind == "개별 PR" and self.new_issue is not None:
            issue = self.new_issue(pr_no, title)
        if item is None and issue is not None:
            # 엑셀 번호(제작사)는 없어도, 같은 개별 PR 로 이미 등록된 항목이면 새로 만들지 않고 그 항목을 쓴다
            item = self._existing_for(issue)
            if item is not None:
                self.index.setdefault(pr_no, item)
        if item is not None:
            if item.issue_id is None and issue is not None:
                item.issue_id = issue.id
            return item
        kac_no, lm_no = (issue.kac_pr_no, issue.lm_pr_no) if issue else (None, None)
        item = PrBatchItem(
            batch_id=self.batch_id, item_kind=kind, issue_id=issue.id if issue else None,
            kac_pr_no=kac_no or (None if lm_no else pr_no),  # 제작사 번호만 있으면 KAC 칸에 같은 번호를 또 넣지 않는다
            lm_pr_no=lm_no,
            title=((issue.title if issue else None) or title or pr_no)[:MAX_TITLE],
            sort_order=self.next_order,
        )
        self.next_order += 1
        self.db.add(item)
        self.db.flush()
        self.created += 1
        self._remember(item)
        return item


async def import_catalog(db: Session, batch_id: int, file: UploadFile, actor: User, dry_run: bool = False) -> dict:
    """기준 엑셀을 버전 PR 목록에 반영한다. 엑셀 PR 이 개별 PR(제작사 번호 기준)에 없으면 개별 PR 도 새로 등록.

    dry_run=True 면 같은 처리를 해 보고 되돌린 뒤, 새로 등록될 개별 PR 목록만 돌려준다 (사용자 확인용).
    """
    content, name, suffix = await _read(file)
    batch = _check_batch(db, batch_id)
    parsed = parse_workbook(content, keep_vba=suffix == ".xlsm")
    if not parsed.catalog and not parsed.records:
        raise ValueError("기준 PR 목록을 읽지 못했습니다. 첫 시트에 PR 번호와 제목 목록이 있어야 합니다.")
    new_issues: list[Issue] = []

    def new_issue(pr_no: str, title: str) -> Issue | None:
        row = parsed.issues.get(pr_no)  # '이슈 번호/문제 내용/수정 내용' 표의 PR 만 자동 등록
        if row is None:
            return None
        issue = create_from_catalog(db, batch, actor.id, pr_no, row.title or title, row.fix)
        new_issues.append(issue)
        return issue

    items = _Items(db, batch_id, new_issue=new_issue)
    for pr_no, title in parsed.catalog.items():
        row = parsed.issues.get(pr_no)
        item = items.ensure(pr_no, (row.title if row else "") or title)
        if item is not None and row and row.fix and not item.actual_fix:
            item.actual_fix = row.fix
    for record in parsed.records:
        item = items.ensure(record.pr_no, record.title or record.sheet_name, record.item_kind)
        if item is not None and record.verify_method and not item.verify_method:
            item.verify_method = record.verify_method
    total = db.scalar(select(func.count(PrBatchItem.id)).where(PrBatchItem.batch_id == batch_id)) or 0
    result = {
        "created_items": items.created, "total_items": total, "filename": name, "dry_run": dry_run,
        "created_issues": len(new_issues),
        "new_issues": [{"pr_no": issue.lm_pr_no, "title": issue.title} for issue in new_issues],
    }
    if dry_run:
        db.rollback()
        return result
    # API가 원본 엑셀 첨부까지 같은 트랜잭션으로 커밋한 뒤 벡터화를 요청한다.
    result["_created_issue_ids"] = [issue.id for issue in new_issues]
    return result


async def import_worker_workbook(db: Session, batch_id: int, actor: User, file: UploadFile) -> dict:
    content, name, suffix = await _read(file)
    defaults = report_defaults(_check_batch(db, batch_id))
    parsed = parse_workbook(content, keep_vba=suffix == ".xlsm")
    if not parsed.records:
        raise ValueError("PR 번호가 있는 시트를 찾지 못했습니다. 시트의 '관련 PR번호' 칸을 확인해 주세요.")
    root = report_root()
    root.mkdir(parents=True, exist_ok=True)
    stored = f"workbook_{batch_id}_{actor.id}_{uuid.uuid4().hex}{suffix}"
    (root / stored).write_bytes(content)
    imported = db.scalar(select(PrWorkbookImport).where(
        PrWorkbookImport.batch_id == batch_id, PrWorkbookImport.user_id == actor.id))
    old_paths: list[Path | None] = []
    if imported is None:
        imported = PrWorkbookImport(batch_id=batch_id, user_id=actor.id)
        db.add(imported)
    else:
        old_paths.append(root / imported.stored_name)
    imported.original_name, imported.stored_name = name, stored
    imported.file_size, imported.file_hash = len(content), hashlib.sha256(content).hexdigest()
    imported.uploaded_at = datetime.now(timezone.utc)

    # 검증 엑셀은 확정된 PR 목록에 결과만 연결한다. 새 PR 등록은 'PR 목록' 단계에서만 한다.
    items = _Items(db, batch_id, can_create=False)
    saved: set[int] = set()
    new_pdfs: list[Path] = []
    skipped, duplicated = [], []
    try:
        db.flush()
        for record in parsed.records:
            item = items.ensure(record.pr_no, record.title or record.sheet_name, record.item_kind)
            if item is None:
                skipped.append(record.sheet_name)
                continue
            if item.id in saved:
                duplicated.append(record.sheet_name)  # 같은 PR 시트가 또 있으면 뒤 시트 내용으로 덮어씀
            if record.verify_method and not item.verify_method:
                item.verify_method = record.verify_method
            values = {k: v for k, v in asdict(record).items() if k in RECORD_FIELDS and v is not None}
            _, old_pdf, new_pdf = apply_record(db, item, actor, values, source_import_id=imported.id, defaults=defaults)
            saved.add(item.id)
            new_pdfs.append(new_pdf)
            if old_pdf not in new_pdfs:  # 중복 시트의 앞 PDF는 new_pdfs 쪽에서 관리
                old_paths.append(old_pdf)
        if not saved:
            raise ValueError("이 버전의 PR 목록과 일치하는 시트가 없습니다. 먼저 [1. PR 목록]에 이 PR을 등록했는지, 시트의 '관련 PR번호' 칸이 맞는지 확인해 주세요. "
                             f"(건너뛴 시트: {', '.join(skipped)})")
        imported.imported_items = len(saved)
        db.commit()
    except Exception:
        db.rollback()
        remove_files([root / stored, *new_pdfs])  # 이번 업로드로 만든 파일만 지운다
        raise
    # 중복 시트로 덮어쓴 중간 PDF도 정리 (최종으로 기록된 파일만 남긴다)
    final = {report_root() / name for name in db.scalars(select(PrVerification.report_stored_name).where(
        PrVerification.source_import_id == imported.id, PrVerification.report_stored_name.is_not(None)))}
    remove_files(old_paths + [p for p in new_pdfs if p not in final])
    return {"import_id": imported.id, "imported_items": len(saved), "filename": name,
            "skipped_sheets": skipped, "duplicate_sheets": duplicated}


def get_workbook_path(db: Session, batch_id: int, user_id: int) -> tuple[Path, str] | None:
    row = db.scalar(select(PrWorkbookImport).where(
        PrWorkbookImport.batch_id == batch_id, PrWorkbookImport.user_id == user_id))
    return (report_root() / row.stored_name, row.original_name) if row else None


def finalize_catalog_import(issue_ids: list[int]) -> None:
    """기준 엑셀과 원본 첨부가 함께 커밋된 뒤 새 개별 PR 벡터화를 예약한다."""
    vectorize_later(issue_ids)
