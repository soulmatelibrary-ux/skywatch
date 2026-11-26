"""PR 검증 기록 저장(엑셀·팝업 공통), 판정 변경, 보고서 조회 및 일괄 PDF."""
import io
import uuid
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.pr_batch import PrBatch, PrBatchItem, PrVerification
from app.models.user import User
from app.services.pr_report_pdf import make_report_pdf

JUDGMENTS = {"미판정", "PASS", "REJECT", "보류", "제외"}
RECORD_FIELDS = (
    "skyline_version", "adaptation_version", "test_segment", "attendees", "tested_on",
    "started_at", "ended_at", "verify_method", "result_summary", "notes",
)
FIELD_LIMITS = {  # DB 컬럼 길이
    "skyline_version": ("Skyline 버전", 100), "adaptation_version": ("Adaptation 버전", 100),
    "test_segment": ("시험 세그먼트", 100), "attendees": ("시험 참석자", 200),
}
_BACKEND_ROOT = Path(__file__).resolve().parents[2]


def report_root() -> Path:
    configured = Path(settings.UPLOAD_DIR)
    base = configured if configured.is_absolute() else (_BACKEND_ROOT / configured).resolve()
    return base / "pr_batches" / "verifications"


def remove_files(paths) -> None:
    for path in paths:
        if path and path.is_file():
            path.unlink()


def _clean(key: str, value):
    """앞뒤 공백 제거, 빈 문자열은 None. 엑셀 값이 컬럼 길이를 넘으면 잘라서 저장한다."""
    if not isinstance(value, str):
        return value
    value = value.strip() or None
    limit = FIELD_LIMITS.get(key)
    return value[:limit[1]] if value and limit else value


def check_lengths(values: dict) -> None:
    for key, (label, limit) in FIELD_LIMITS.items():
        text = values.get(key)
        if isinstance(text, str) and len(text.strip()) > limit:
            raise ValueError(f"{label}은(는) {limit}자 이내로 입력해 주세요. (현재 {len(text.strip())}자)")




def _write_pdf(v: PrVerification, item: PrBatchItem, author: str) -> Path | None:
    root = report_root()
    root.mkdir(parents=True, exist_ok=True)
    old = root / v.report_stored_name if v.report_stored_name else None
    content = make_report_pdf(item, v, author)
    stored = f"{uuid.uuid4().hex}.pdf"
    (root / stored).write_bytes(content)
    v.report_stored_name = stored
    v.report_original_name = f"{item.kac_pr_no or item.lm_pr_no or item.id}_{author}_검증보고서.pdf"
    v.report_file_size = len(content)
    v.report_uploaded_at = datetime.now(timezone.utc)
    return old


def apply_record(
    db: Session, item: PrBatchItem, actor: User, values: dict,
    result: str | None = None, source_import_id: int | None = None, defaults: dict | None = None,
) -> tuple[PrVerification, Path | None, Path]:
    """근무자·PR당 최신 기록 하나를 덮어쓰고 PDF를 다시 만든다. (기록, 이전 PDF, 새 PDF) 경로를 반환.

    defaults: values 에 없고 기록에도 비어 있는 칸만 채운다 (버전 보고서 기본값 — 엑셀에 빈 칸일 때).
    새 PDF 경로를 따로 돌려주는 이유: 커밋이 실패하면 ORM 속성이 만료되어 새 파일명을 다시 알 수 없다.
    """
    v = db.scalar(select(PrVerification).where(
        PrVerification.item_id == item.id, PrVerification.user_id == actor.id,
        PrVerification.is_deleted.is_(False),
    ).order_by(PrVerification.round_no.desc()).limit(1))
    if v is None:
        v = PrVerification(item_id=item.id, user_id=actor.id, round_no=1, created_by=actor.id)
        db.add(v)
        db.flush()  # autoflush=False: 같은 업로드의 다음 시트가 이 기록을 찾아 덮어쓰도록 즉시 반영
    for key in RECORD_FIELDS:
        if key in values:
            setattr(v, key, _clean(key, values[key]))
    for key, value in (defaults or {}).items():
        if key in RECORD_FIELDS and key not in values and value and not getattr(v, key):
            setattr(v, key, _clean(key, value))
    if result is not None:
        v.result = result
    elif v.result not in JUDGMENTS:
        v.result = "미판정"
    v.test_case_code = item.kac_pr_no or item.lm_pr_no
    if source_import_id is not None:
        v.source_import_id = source_import_id
    v.submitted_by = actor.id
    v.submitted_at = datetime.now(timezone.utc)
    old = _write_pdf(v, item, actor.name)
    return v, old, report_root() / v.report_stored_name


MAX_BODY_CHARS = 40 * 1024 * 1024  # 붙여넣은 이미지(base64) 포함 본문 상한


def get_verification(db: Session, verification_id: int) -> dict | None:
    v = db.get(PrVerification, verification_id)
    if v is None or v.is_deleted:
        return None
    return {"id": v.id, "item_id": v.item_id, "user_id": v.user_id, "result": v.result,
            **{key: getattr(v, key) for key in RECORD_FIELDS}}


def save_verification(db: Session, item_id: int, actor: User, values: dict, result: str) -> int:
    if result not in JUDGMENTS:
        raise ValueError("판정은 미판정, PASS, REJECT, 보류, 제외 중 하나여야 합니다.")
    if sum(len(values.get(k) or "") for k in ("verify_method", "result_summary", "notes")) > MAX_BODY_CHARS:
        raise ValueError("본문이 너무 큽니다. 붙여넣은 이미지 수나 크기를 줄여 주세요.")
    check_lengths(values)
    item = db.get(PrBatchItem, item_id)
    batch = db.get(PrBatch, item.batch_id) if item else None
    if item is None or batch is None or batch.is_deleted:
        raise ValueError("PR 항목을 찾을 수 없습니다.")
    v, old, new = apply_record(db, item, actor, values, result)
    try:
        db.commit()
    except Exception:
        db.rollback()
        remove_files([new])  # 이전 PDF는 DB가 다시 가리키므로 그대로 둔다
        raise
    remove_files([old])
    return v.id


def set_result(db: Session, verification_id: int, actor: User, result: str) -> None:
    if result not in JUDGMENTS:
        raise ValueError("판정은 미판정, PASS, REJECT, 보류, 제외 중 하나여야 합니다.")
    v = db.get(PrVerification, verification_id)
    if v is None or v.is_deleted:
        raise LookupError("검증 기록을 찾을 수 없습니다.")
    if v.user_id != actor.id and actor.role != "admin":
        raise PermissionError("본인 검증 기록만 판정을 변경할 수 있습니다.")
    v.result = result
    owner = db.get(User, v.user_id)
    old = _write_pdf(v, db.get(PrBatchItem, v.item_id), owner.name if owner else "근무자")
    new = report_root() / v.report_stored_name
    try:
        db.commit()
    except Exception:
        db.rollback()
        remove_files([new])
        raise
    remove_files([old])


def delete_verification(db: Session, verification_id: int, actor: User) -> None:
    """검증 기록과 보고서 PDF를 지운다. 같은 PR을 다시 입력하면 새 기록으로 만든다."""
    v = db.get(PrVerification, verification_id)
    if v is None or v.is_deleted:
        raise LookupError("검증 기록을 찾을 수 없습니다.")
    if v.user_id != actor.id and actor.role != "admin":
        raise PermissionError("본인 검증 기록만 삭제할 수 있습니다.")
    pdf = report_root() / v.report_stored_name if v.report_stored_name else None
    db.delete(v)
    db.commit()
    remove_files([pdf])


def get_report_path(db: Session, verification_id: int) -> tuple[Path, str] | None:
    v = db.get(PrVerification, verification_id)
    if v is None or v.is_deleted or not v.report_stored_name:
        return None
    return report_root() / v.report_stored_name, v.report_original_name or "report.pdf"


def merge_reports(
    db: Session, batch_id: int, user_id: int | None = None, item_ids: list[int] | None = None,
) -> tuple[io.BytesIO, str, int]:
    batch = db.get(PrBatch, batch_id)
    if batch is None or batch.is_deleted:
        raise ValueError("배치를 찾을 수 없습니다.")
    query = (
        select(PrVerification, PrBatchItem, User.name)
        .join(PrBatchItem, PrBatchItem.id == PrVerification.item_id)
        .join(User, User.id == PrVerification.user_id)
        .where(PrBatchItem.batch_id == batch_id, PrVerification.is_deleted.is_(False),
               PrVerification.report_stored_name.is_not(None))
        .order_by(PrBatchItem.sort_order, PrBatchItem.id, User.name, PrVerification.round_no)
    )
    if user_id is not None:
        query = query.where(PrVerification.user_id == user_id)
    if item_ids:
        query = query.where(PrBatchItem.id.in_(item_ids))
    latest: dict[tuple[int, int], tuple] = {}
    for row in db.execute(query).all():
        latest[(row[0].item_id, row[0].user_id)] = row
    if not latest:
        raise ValueError("다운로드할 검증 보고서가 없습니다.")
    writer = PdfWriter()
    for v, item, user_name in latest.values():
        path = report_root() / v.report_stored_name
        if not path.is_file():
            raise ValueError(f"보고서 파일을 찾을 수 없습니다: {v.report_original_name}")
        start = len(writer.pages)
        for page in PdfReader(str(path)).pages:
            writer.add_page(page)
        writer.add_outline_item(f"{item.kac_pr_no or item.lm_pr_no or item.id} - {user_name}", start)
    output = io.BytesIO()
    writer.write(output)
    output.seek(0)
    version = "".join(c if c.isalnum() or c in "-_." else "_" for c in batch.sw_version)
    return output, f"{version}_검증보고서_{len(latest)}건.pdf", len(latest)
