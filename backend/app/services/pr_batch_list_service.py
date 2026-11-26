"""PR 배치 목록 조회 서비스."""
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.issue import Issue
from app.models.pr_batch import PrBatch, PrBatchAttachment, PrBatchItem, PrVerification, PrWorkbookImport
from app.models.user import User


def _user_name(db: Session, user_id: int | None) -> str | None:
    if not user_id:
        return None
    return db.execute(select(User.name).where(User.id == user_id)).scalar_one_or_none()


def list_batches(
    db: Session,
    status: str | None = None,
    year: int | None = None,
    skip: int = 0,
    limit: int = 50,
    query: str | None = None,
) -> tuple[list[dict], int]:
    q = select(PrBatch).where(PrBatch.is_deleted.is_(False))
    if status:
        q = q.where(PrBatch.status == status)
    if year:
        q = q.where(func.extract("year", PrBatch.agreed_date) == year)
    if query and query.strip():
        pattern = f"%{query.strip()}%"
        q = q.where(or_(
            PrBatch.sw_version.ilike(pattern), PrBatch.previous_version.ilike(pattern),
            PrBatch.batch_no.ilike(pattern), PrBatch.summary.ilike(pattern),
        ))

    total = db.execute(select(func.count()).select_from(q.subquery())).scalar_one()
    batches = db.execute(
        q.order_by(PrBatch.agreed_date.desc(), PrBatch.id.desc()).offset(skip).limit(limit)
    ).scalars().all()

    if not batches:
        return [], total

    ids = [b.id for b in batches]
    item_counts = dict(db.execute(
        select(PrBatchItem.batch_id, func.count().label("cnt"))
        .where(PrBatchItem.batch_id.in_(ids))
        .group_by(PrBatchItem.batch_id)
    ).all())
    done_counts = dict(db.execute(
        select(PrBatchItem.batch_id, func.count().label("cnt"))
        .where(PrBatchItem.batch_id.in_(ids), PrBatchItem.item_status == "수정완료")
        .group_by(PrBatchItem.batch_id)
    ).all())
    att_counts = dict(db.execute(
        select(PrBatchAttachment.batch_id, func.count().label("cnt"))
        .where(PrBatchAttachment.batch_id.in_(ids), PrBatchAttachment.is_deleted.is_(False))
        .group_by(PrBatchAttachment.batch_id)
    ).all())
    verification_counts = dict(db.execute(
        select(PrBatchItem.batch_id, func.count(PrVerification.id).label("cnt"))
        .join(PrVerification, PrVerification.item_id == PrBatchItem.id)
        .where(PrBatchItem.batch_id.in_(ids), PrVerification.is_deleted.is_(False))
        .group_by(PrBatchItem.batch_id)
    ).all())
    # 보고서가 1건 이상 있는 PR 수 (근무자 여러 명이 검증해도 PR당 1)
    verified_item_counts = dict(db.execute(
        select(PrBatchItem.batch_id, func.count(func.distinct(PrBatchItem.id)).label("cnt"))
        .join(PrVerification, PrVerification.item_id == PrBatchItem.id)
        .where(
            PrBatchItem.batch_id.in_(ids), PrVerification.is_deleted.is_(False),
            PrVerification.report_stored_name.is_not(None),
        )
        .group_by(PrBatchItem.batch_id)
    ).all())
    reject_counts = dict(db.execute(
        select(PrBatchItem.batch_id, func.count(PrVerification.id).label("cnt"))
        .join(PrVerification, PrVerification.item_id == PrBatchItem.id)
        .where(
            PrBatchItem.batch_id.in_(ids), PrVerification.is_deleted.is_(False),
            PrVerification.result == "REJECT",
        )
        .group_by(PrBatchItem.batch_id)
    ).all())

    return [
        {
            "id": b.id, "batch_no": b.batch_no, "sw_version": b.sw_version,
            "previous_version": b.previous_version,
            "skyline_version": b.skyline_version, "adaptation_version": b.adaptation_version,
            "test_segment": b.test_segment,
            "agreed_date": b.agreed_date, "target_date": b.target_date,
            "delivery_date": b.delivery_date, "verified_date": b.verified_date,
            "status": b.status, "summary": b.summary,
            "item_count": item_counts.get(b.id, 0),
            "done_count": done_counts.get(b.id, 0),
            "attachment_count": att_counts.get(b.id, 0),
            "verification_count": verification_counts.get(b.id, 0),
            "verified_item_count": verified_item_counts.get(b.id, 0),
            "reject_count": reject_counts.get(b.id, 0),
        }
        for b in batches
    ], total


def find_batch_item(
    db: Session, issue_id: int | None = None, kac_pr_no: str | None = None, lm_pr_no: str | None = None,
) -> dict | None:
    """개별 PR 화면에서 가장 최근 버전의 연결 항목을 바로 찾는다."""
    conditions = []
    if issue_id:
        conditions.append(PrBatchItem.issue_id == issue_id)
    if kac_pr_no:
        conditions.append(func.upper(PrBatchItem.kac_pr_no) == kac_pr_no.strip().upper())
    if lm_pr_no:
        conditions.append(func.upper(PrBatchItem.lm_pr_no) == lm_pr_no.strip().upper())
    if not conditions:
        return None
    row = db.execute(
        select(PrBatchItem.batch_id, PrBatchItem.id)
        .join(PrBatch, PrBatch.id == PrBatchItem.batch_id)
        .where(PrBatch.is_deleted.is_(False), or_(*conditions))
        .order_by(PrBatch.agreed_date.desc(), PrBatch.id.desc(), PrBatchItem.id)
        .limit(1)
    ).first()
    return {"batch_id": row.batch_id, "item_id": row.id} if row else None


def get_batch(db: Session, batch_id: int) -> dict | None:
    batch = db.execute(
        select(PrBatch).where(PrBatch.id == batch_id, PrBatch.is_deleted.is_(False))
    ).scalar_one_or_none()
    if not batch:
        return None

    items = db.execute(
        select(PrBatchItem)
        .where(PrBatchItem.batch_id == batch_id)
        .order_by(PrBatchItem.sort_order, PrBatchItem.id)
    ).scalars().all()
    issue_ids = [it.issue_id for it in items if it.issue_id]
    issue_contents = dict(db.execute(  # 연결된 개별 PR 의 상세 내용 (PR 등록 탭 펼침에 표시)
        select(Issue.id, Issue.content).where(Issue.id.in_(issue_ids))
    ).all()) if issue_ids else {}
    atts = db.execute(
        select(PrBatchAttachment)
        .where(PrBatchAttachment.batch_id == batch_id, PrBatchAttachment.is_deleted.is_(False))
        .order_by(PrBatchAttachment.id)
    ).scalars().all()
    workbook_imports = db.execute(
        select(PrWorkbookImport, User.name)
        .join(User, User.id == PrWorkbookImport.user_id)
        .where(PrWorkbookImport.batch_id == batch_id)
        .order_by(User.name)
    ).all()
    verification_rows = db.execute(
        select(PrVerification, User.name, User.team)
        .join(PrBatchItem, PrBatchItem.id == PrVerification.item_id)
        .join(User, User.id == PrVerification.user_id)
        .where(PrBatchItem.batch_id == batch_id, PrVerification.is_deleted.is_(False))
        .order_by(PrBatchItem.sort_order, PrVerification.created_at, PrVerification.round_no)
    ).all()

    return {
        "id": batch.id, "batch_no": batch.batch_no, "sw_version": batch.sw_version,
        "previous_version": batch.previous_version,
        "skyline_version": batch.skyline_version, "adaptation_version": batch.adaptation_version,
        "test_segment": batch.test_segment,
        "agreed_date": batch.agreed_date, "target_date": batch.target_date,
        "delivery_date": batch.delivery_date, "verified_date": batch.verified_date,
        "status": batch.status, "summary": batch.summary, "notes": batch.notes,
        "created_by": batch.created_by, "created_by_name": _user_name(db, batch.created_by),
        "created_at": batch.created_at, "updated_at": batch.updated_at,
        "items": [
            {
                "id": it.id, "batch_id": it.batch_id, "issue_id": it.issue_id, "item_kind": it.item_kind,
                "kac_pr_no": it.kac_pr_no, "lm_pr_no": it.lm_pr_no, "title": it.title,
                "agreed_content": it.agreed_content, "actual_fix": it.actual_fix,
                "verify_method": it.verify_method, "item_status": it.item_status,
                "issue_content": issue_contents.get(it.issue_id),
                "sort_order": it.sort_order, "created_at": it.created_at, "updated_at": it.updated_at,
            }
            for it in items
        ],
        "attachments": [
            {
                "id": a.id, "batch_id": a.batch_id, "doc_type": a.doc_type,
                "original_name": a.original_name, "stored_name": a.stored_name,
                "file_size": a.file_size, "uploaded_by": a.uploaded_by, "uploaded_at": a.uploaded_at,
            }
            for a in atts
        ],
        "verifications": [
            {
                "id": v.id, "item_id": v.item_id, "user_id": v.user_id,
                "user_name": user_name, "user_team": user_team, "round_no": v.round_no,
                "result": v.result, "test_case_code": v.test_case_code,
                "skyline_version": v.skyline_version, "adaptation_version": v.adaptation_version,
                "test_segment": v.test_segment, "attendees": v.attendees,
                "tested_on": v.tested_on, "started_at": v.started_at, "ended_at": v.ended_at,
                "report_original_name": v.report_original_name, "report_file_size": v.report_file_size,
                "report_uploaded_at": v.report_uploaded_at, "submitted_by": v.submitted_by,
                "submitted_at": v.submitted_at, "source_import_id": v.source_import_id,
                "created_by": v.created_by, "created_at": v.created_at, "updated_at": v.updated_at,
            }
            for v, user_name, user_team in verification_rows
        ],
        "workbook_imports": [
            {"id": w.id, "user_id": w.user_id, "user_name": user_name,
             "original_name": w.original_name, "file_size": w.file_size,
             "file_hash": w.file_hash, "imported_items": w.imported_items,
             "uploaded_at": w.uploaded_at}
            for w, user_name in workbook_imports
        ],
    }
