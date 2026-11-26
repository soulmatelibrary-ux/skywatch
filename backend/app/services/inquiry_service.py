from __future__ import annotations

import csv
import io
import re
from datetime import datetime, timezone

from dateutil import parser as date_parser
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from sqlalchemy import Integer, and_, cast, func, or_, select
from sqlalchemy.orm import Session

from app.models.inquiry import Inquiry
from app.models.user import User
from app.schemas.inquiry import InquiryCreate, InquiryUpdate


def _next_inquiry_no(db: Session) -> str:
    stmt = (
        select(func.max(cast(func.substr(Inquiry.inquiry_no, 2), Integer)))
        .where(
            and_(
                Inquiry.is_deleted.is_(False),
                Inquiry.inquiry_no.regexp_match(r"^H[0-9]{5}$"),
            )
        )
    )
    max_no = db.execute(stmt).scalar() or 2488
    return f"H{max_no + 1:05d}"


def _parse_query_terms(q: str) -> tuple[list[str], list[str]]:
    """'&' 구분자와 '!' 접두어를 파싱해 (포함 조건 목록, 제외 조건 목록) 반환."""
    include_terms: list[str] = []
    exclude_terms: list[str] = []
    for raw in q.split("&"):
        term = raw.strip()
        if not term:
            continue
        if term.startswith("!"):
            t = term[1:].strip()
            if t:
                exclude_terms.append(t)
        else:
            include_terms.append(term)
    return include_terms, exclude_terms


def _normalize_key(value: object) -> str:
    return str(value or "").strip().lower()


def _get_text(row: dict[str, object], *keys: str) -> str:
    for key in keys:
        value = row.get(_normalize_key(key))
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return ""


def _exists_inquiry_no(db: Session, inquiry_no: str) -> bool:
    return db.query(Inquiry.id).filter(Inquiry.inquiry_no == inquiry_no).first() is not None


def _max_inquiry_seq(db: Session) -> int:
    stmt = (
        select(func.max(cast(func.substr(Inquiry.inquiry_no, 2), Integer)))
        .where(
            and_(
                Inquiry.is_deleted.is_(False),
                Inquiry.inquiry_no.regexp_match(r"^H[0-9]{5}$"),
            )
        )
    )
    return db.execute(stmt).scalar() or 2488


def _format_inquiry_no(seq: int) -> str:
    return f"H{seq:05d}"


_SORTABLE = {
    "inquiry_no": Inquiry.inquiry_no,
    "occurred_date": Inquiry.occurred_date,
    "occurred_time": Inquiry.occurred_time,
    "controller_sector": Inquiry.controller_sector,
    "sw_version": Inquiry.sw_version,
    "received_by_name": func.coalesce(User.name, Inquiry.received_by_raw),
    "category": Inquiry.category,
    "keyword": Inquiry.keyword,
    "status": Inquiry.status,
    "completed_date": Inquiry.completed_date,
    "pr_no": Inquiry.pr_no,
}


def _list_order(sort: str | None, order: str) -> list:
    """정렬 컬럼 화이트리스트 적용. 미지정 시 발생일자 최신순."""
    col = _SORTABLE.get(sort or "")
    if col is None:
        return [Inquiry.occurred_date.desc(), Inquiry.id.desc()]
    primary = col.asc().nulls_last() if order == "asc" else col.desc().nulls_last()
    return [primary, Inquiry.occurred_date.desc(), Inquiry.id.desc()]


def list_inquiries(
    db: Session,
    year: int | None = None,
    month: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    category: str | None = None,
    status: str | None = None,
    q: str | None = None,
    page: int = 1,
    per_page: int = 100,
    sn_db: Session | None = None,
    sort: str | None = None,
    order: str = "desc",
) -> tuple[list[dict], int]:
    stmt = (
        select(
            Inquiry.id,
            Inquiry.inquiry_no,
            Inquiry.occurred_date,
            Inquiry.occurred_time,
            Inquiry.controller_sector,
            Inquiry.sw_version,
            Inquiry.received_by,
            User.name.label("received_by_name"),
            Inquiry.received_by_raw,
            Inquiry.category,
            Inquiry.keyword,
            Inquiry.content,
            Inquiry.status,
            Inquiry.completed_date,
            Inquiry.pr_no,
            Inquiry.note,
            Inquiry.card_id,
            Inquiry.created_by,
            Inquiry.created_at,
            Inquiry.updated_at,
        )
        .outerjoin(User, Inquiry.received_by == User.id)
        .where(Inquiry.is_deleted.is_(False))
    )

    if year is not None and month is not None:
        stmt = stmt.where(
            and_(
                func.extract("year", Inquiry.occurred_date) == year,
                func.extract("month", Inquiry.occurred_date) == month,
            )
        )
    if date_from:
        try:
            from_date = datetime.strptime(date_from, "%Y-%m-%d").date()
            stmt = stmt.where(Inquiry.occurred_date >= from_date)
        except (ValueError, TypeError):
            pass
    if date_to:
        try:
            to_date = datetime.strptime(date_to, "%Y-%m-%d").date()
            stmt = stmt.where(Inquiry.occurred_date <= to_date)
        except (ValueError, TypeError):
            pass
    if category:
        stmt = stmt.where(Inquiry.category == category)
    if status:
        stmt = stmt.where(Inquiry.status == status)
    if q:
        include_terms, exclude_terms = _parse_query_terms(q)
        all_conds = []

        for i, term in enumerate(include_terms):
            like_cond = or_(
                Inquiry.keyword.ilike(f"%{term}%"),
                Inquiry.content.ilike(f"%{term}%"),
            )
            # 단일 포함 조건 + 제외 없을 때만 벡터 검색 보조 적용
            if i == 0 and len(include_terms) == 1 and not exclude_terms and sn_db is not None:
                try:
                    from app.services.inquiry_vector_service import search_inquiries_by_vector
                    vec_ids = [inq_id for inq_id, _ in search_inquiries_by_vector(sn_db, term)]
                except Exception as _ve:
                    import logging as _log
                    _log.getLogger(__name__).warning(f"[문의사항 벡터 검색 실패] {_ve}")
                    vec_ids = []
                all_conds.append(or_(like_cond, Inquiry.id.in_(vec_ids)) if vec_ids else like_cond)
            else:
                all_conds.append(like_cond)

        for term in exclude_terms:
            all_conds.append(
                ~or_(Inquiry.keyword.ilike(f"%{term}%"), Inquiry.content.ilike(f"%{term}%"))
            )

        if all_conds:
            stmt = stmt.where(and_(*all_conds))

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar() or 0
    offset = (page - 1) * per_page
    rows = db.execute(stmt.order_by(*_list_order(sort, order)).offset(offset).limit(per_page)).all()
    return [dict(row._mapping) for row in rows], total


def get_inquiry(db: Session, inquiry_id: int) -> dict | None:
    stmt = (
        select(
            Inquiry.id,
            Inquiry.inquiry_no,
            Inquiry.occurred_date,
            Inquiry.occurred_time,
            Inquiry.controller_sector,
            Inquiry.sw_version,
            Inquiry.received_by,
            User.name.label("received_by_name"),
            Inquiry.received_by_raw,
            Inquiry.category,
            Inquiry.keyword,
            Inquiry.content,
            Inquiry.status,
            Inquiry.completed_date,
            Inquiry.pr_no,
            Inquiry.note,
            Inquiry.card_id,
            Inquiry.created_by,
            Inquiry.created_at,
            Inquiry.updated_at,
        )
        .outerjoin(User, Inquiry.received_by == User.id)
        .where(and_(Inquiry.id == inquiry_id, Inquiry.is_deleted.is_(False)))
    )
    row = db.execute(stmt).first()
    return dict(row._mapping) if row else None


def create_inquiry(db: Session, uid: int, data: InquiryCreate) -> Inquiry:
    inquiry_no = _next_inquiry_no(db)
    inq = Inquiry(
        inquiry_no=inquiry_no,
        occurred_date=data.occurred_date,
        occurred_time=data.occurred_time,
        controller_sector=data.controller_sector,
        sw_version=data.sw_version,
        received_by=data.received_by,
        category=data.category,
        keyword=data.keyword,
        content=data.content,
        status=data.status,
        completed_date=data.completed_date,
        pr_no=data.pr_no,
        note=data.note,
        card_id=data.card_id,
        created_by=uid,
    )
    db.add(inq)
    db.flush()
    return inq


def update_inquiry(db: Session, inquiry_id: int, uid: int, data: InquiryUpdate) -> Inquiry | None:
    inq = db.query(Inquiry).filter(and_(Inquiry.id == inquiry_id, Inquiry.is_deleted.is_(False))).first()
    if not inq:
        return None

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(inq, key, value)
    inq.last_edited_by = uid
    db.flush()
    return inq


def soft_delete(db: Session, inquiry_id: int, uid: int) -> bool:
    inq = db.query(Inquiry).filter(and_(Inquiry.id == inquiry_id, Inquiry.is_deleted.is_(False))).first()
    if not inq:
        return False

    inq.is_deleted = True
    inq.deleted_by = uid
    inq.deleted_at = datetime.now(timezone.utc)
    db.flush()
    return True


def export_excel(
    db: Session,
    year: int | None = None,
    month: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    category: str | None = None,
    status: str | None = None,
    q: str | None = None,
) -> bytes:
    rows, _ = list_inquiries(
        db, year=year, month=month,
        date_from=date_from, date_to=date_to,
        category=category, status=status, q=q,
        per_page=10000,
    )

    status_map = {
        "completed": "완료",
        "in_progress": "진행중",
        "pr_registered": "PR등록",
        "pr_duplicate": "PR중복",
        "tracking": "추적관찰",
    }

    if year and month:
        sheet_title = f"{year}년 {month:02d}월"
    elif year:
        sheet_title = f"{year}년"
    elif date_from or date_to:
        sheet_title = f"{date_from or ''}~{date_to or ''}"
    else:
        sheet_title = "전체"

    wb = Workbook()
    ws = wb.active
    ws.title = sheet_title

    headers = [
        "문의번호", "발생일자", "발생시간", "관제분야", "SW버전", "신고인",
        "카테고리", "키워드", "내용", "진행상태", "완료일자", "PR번호", "비고",
    ]
    ws.append(headers)

    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill(start_color="1e3a8a", end_color="1e3a8a", fill_type="solid")
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for row_num, row_data in enumerate(rows, start=2):
        content_text = re.sub(r"<[^>]+>", " ", row_data.get("content") or "").strip()
        status = row_data.get("status", "")
        status_ko = status_map.get(status, status) if status else ""
        ws.append([
            row_data.get("inquiry_no", ""),
            str(row_data.get("occurred_date")) if row_data.get("occurred_date") else "",
            row_data.get("occurred_time") or "",
            row_data.get("controller_sector") or "",
            row_data.get("sw_version") or "",
            row_data.get("received_by_name") or row_data.get("received_by_raw") or "",
            row_data.get("category") or "",
            row_data.get("keyword") or "",
            content_text,
            status_ko,
            str(row_data.get("completed_date")) if row_data.get("completed_date") else "",
            row_data.get("pr_no") or "",
            row_data.get("note") or "",
        ])

        # 각 셀에 텍스트 줄바꿈 적용
        for cell in ws[row_num]:
            cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)

        # 내용(content) 셀의 개행 수에 따라 행 높이 조절
        content_cell = ws[row_num][8]
        line_count = (content_cell.value or "").count("\n") + 1
        ws.row_dimensions[row_num].height = max(20, line_count * 15)

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def get_categories(db: Session) -> list[str]:
    stmt = (
        select(Inquiry.category.distinct())
        .where(and_(Inquiry.is_deleted.is_(False), Inquiry.category.isnot(None)))
        .order_by(Inquiry.category)
    )
    return [row[0] for row in db.execute(stmt).all()]


def import_inquiries(db: Session, uid: int, file_content: bytes, file_type: str) -> dict:
    import_result = {"total": 0, "success": 0, "skipped": 0, "errors": []}
    next_auto_seq = _max_inquiry_seq(db) + 1

    try:
        rows: list[dict[str, object]] = []

        if file_type == "csv":
            try:
                text_content = file_content.decode("utf-8-sig")
            except UnicodeDecodeError:
                text_content = file_content.decode("cp949")
            reader = csv.DictReader(io.StringIO(text_content))
            rows = [{_normalize_key(k): v for k, v in row.items()} for row in reader]

        elif file_type in ("xlsx", "xls"):
            wb = load_workbook(io.BytesIO(file_content))
            ws = wb.active
            headers = [_normalize_key(cell.value) for cell in ws[1]]
            for row in ws.iter_rows(min_row=2, values_only=True):
                row_dict: dict[str, object] = {}
                for idx, header in enumerate(headers):
                    if not header:
                        continue
                    row_dict[header] = row[idx] if idx < len(row) else None
                rows.append(row_dict)
        else:
            import_result["errors"].append(f"지원하지 않는 파일 형식: {file_type}")
            return import_result

        for row_data in rows:
            import_result["total"] += 1
            try:
                occurred_date_str = _get_text(row_data, "발생일자", "date", "occurred_date")
                if not occurred_date_str:
                    import_result["skipped"] += 1
                    import_result["errors"].append(f"{import_result['total']}행: 발생일자 필수")
                    continue

                try:
                    occurred_date = date_parser.parse(occurred_date_str).date()
                except Exception:
                    import_result["skipped"] += 1
                    import_result["errors"].append(
                        f"{import_result['total']}행: 날짜 형식 오류 ({occurred_date_str})"
                    )
                    continue

                # 문의번호는 항상 내부 재생성
                while _exists_inquiry_no(db, _format_inquiry_no(next_auto_seq)):
                    next_auto_seq += 1
                inquiry_no = _format_inquiry_no(next_auto_seq)
                next_auto_seq += 1

                completed_date = None
                completed_date_str = _get_text(row_data, "완료일자", "완료일", "completed_date")
                if completed_date_str:
                    try:
                        completed_date = date_parser.parse(completed_date_str).date()
                    except Exception:
                        completed_date = None

                received_by_raw = _get_text(row_data, "신고인", "접수자", "received_by")
                received_by = None
                if received_by_raw:
                    user = db.query(User).filter(User.name == received_by_raw).first()
                    if user:
                        received_by = user.id

                status_raw = _get_text(row_data, "진행상태", "처리상태", "status")
                status_map = {
                    "완료": "completed",
                    "진행중": "in_progress",
                    "pr등록": "pr_registered",
                    "pr중복": "pr_duplicate",
                    "추적관찰": "tracking",
                }
                status = status_map.get(status_raw.lower() if status_raw else "", "in_progress")

                occurred_time_raw = _get_text(row_data, "발생시간", "시간(z)", "시간", "occurred_time")
                occurred_time = occurred_time_raw[:10] if occurred_time_raw else None

                inq = Inquiry(
                    inquiry_no=inquiry_no,
                    occurred_date=occurred_date,
                    occurred_time=occurred_time,
                    controller_sector=_get_text(row_data, "관제분야", "관제사(섹터)", "관제사", "controller_sector") or None,
                    sw_version=_get_text(row_data, "sw버전", "버전", "발생버전", "sw_version") or None,
                    received_by=received_by,
                    received_by_raw=received_by_raw or None,
                    category=_get_text(row_data, "카테고리", "category") or None,
                    keyword=_get_text(row_data, "키워드", "keyword") or None,
                    content=re.sub(r"_x000D_\r?\n?", "\n", _get_text(row_data, "내용", "상세내용", "content")).strip() or None,
                    status=status,
                    completed_date=completed_date,
                    pr_no=_get_text(row_data, "pr번호", "prno", "pr_no") or None,
                    note=_get_text(row_data, "비고", "note") or None,
                    created_by=uid,
                )
                with db.begin_nested():
                    db.add(inq)
                    db.flush()
                import_result["success"] += 1
            except Exception as e:
                import_result["skipped"] += 1
                import_result["errors"].append(f"{import_result['total']}행: {str(e)}")

        db.commit()
    except Exception as e:
        db.rollback()
        import_result["errors"].append(f"파일 처리 중 오류: {str(e)}")

    return import_result
