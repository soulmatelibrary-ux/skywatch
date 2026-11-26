# 문의사항 API 라우터
from datetime import datetime
from urllib.parse import quote
import io

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.db.skynet_session import get_skynet_db
from app.models.user import User
from app.schemas.inquiry import InquiryCreate, InquiryResponse, InquiryUpdate
from app.services import inquiry_auto_service, inquiry_service
from app.services.inquiry_vector_service import schedule_vectorize_inquiry
from app.schemas.common import ApiResponse


router = APIRouter(prefix="/api/inquiries", tags=["inquiries"])


@router.get("", response_model=ApiResponse[dict])
def list_inquiries(
    year: int | None = Query(None),
    month: int | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    category: str | None = Query(None),
    status: str | None = Query(None),
    q: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(100, ge=1, le=200),
    sort: str | None = Query(None),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    sn_db: Session = Depends(get_skynet_db),
    _: User = Depends(get_current_user),
):
    """문의사항 목록 조회."""
    rows, total = inquiry_service.list_inquiries(db, year, month, date_from, date_to, category, status, q, page, per_page, sn_db, sort, order)
    return {
        "data": {
            "items": rows,
            "total": total,
            "page": page,
            "per_page": per_page,
        }
    }


@router.post("", response_model=ApiResponse[InquiryResponse])
def create_inquiry(
    data: InquiryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """신규 문의사항 등록."""
    inq = inquiry_service.create_inquiry(db, user.id, data)
    db.commit()

    schedule_vectorize_inquiry(inq.id)
    result_data = inquiry_service.get_inquiry(db, inq.id)
    return {"data": result_data}


@router.get("/export/excel", response_class=StreamingResponse)
def export_excel(
    year: int | None = Query(None),
    month: int | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    category: str | None = Query(None),
    status: str | None = Query(None),
    q: str | None = Query(None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """엑셀 반출 (현재 필터 조건 적용)."""
    if month is not None and not (1 <= month <= 12):
        raise HTTPException(status_code=400, detail="Invalid month")

    xlsx_bytes = inquiry_service.export_excel(db, year, month, date_from, date_to, category, status, q)

    if year and month:
        filename = f"문의사항관리대장_{year}년{month:02d}월.xlsx"
    elif year:
        filename = f"문의사항관리대장_{year}년.xlsx"
    elif date_from or date_to:
        filename = f"문의사항관리대장_{date_from or ''}~{date_to or ''}.xlsx"
    else:
        filename = "문의사항관리대장_전체.xlsx"

    return StreamingResponse(
        io.BytesIO(xlsx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"},
    )


@router.get("/meta/categories", response_model=ApiResponse[list[str]])
def get_categories(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """카테고리 목록 (자동완성)."""
    categories = inquiry_service.get_categories(db)
    return {"data": categories}


@router.get("/meta/latest-sw-version", response_model=ApiResponse[str | None])
def get_latest_sw_version(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """발생버전 기본값 — 가장 최근에 입력된 문의사항의 발생버전 (없으면 null)."""
    return {"data": inquiry_auto_service.latest_sw_version(db)}


@router.get("/{inquiry_id}", response_model=ApiResponse[InquiryResponse])
def get_inquiry(
    inquiry_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """단건 조회."""
    data = inquiry_service.get_inquiry(db, inquiry_id)
    if not data:
        raise HTTPException(status_code=404, detail="Not found")
    return {"data": data}


@router.patch("/{inquiry_id}", response_model=ApiResponse[InquiryResponse])
def update_inquiry(
    inquiry_id: int,
    data: InquiryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """부분 업데이트 (인라인 편집)."""
    inq = inquiry_service.update_inquiry(db, inquiry_id, user.id, data)
    if not inq:
        raise HTTPException(status_code=404, detail="Not found")
    db.commit()

    schedule_vectorize_inquiry(inq.id)
    result_data = inquiry_service.get_inquiry(db, inq.id)
    return {"data": result_data}


@router.delete("/{inquiry_id}", response_model=ApiResponse[dict])
def delete_inquiry(
    inquiry_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """소프트 삭제."""
    success = inquiry_service.soft_delete(db, inquiry_id, user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Not found")
    db.commit()
    return {"data": {}}


@router.post("/import/bulk", response_model=ApiResponse[dict])
async def import_inquiries(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """CSV/Excel 파일로 일괄 임포트 (문의사항관리대장 형식).

    지원 형식: .csv, .xlsx, .xls
    파일 크기 제한: 최대 10MB
    """
    # 파일 확장자 확인
    file_name = file.filename.lower()
    if file_name.endswith('.csv'):
        file_type = 'csv'
    elif file_name.endswith('.xlsx'):
        file_type = 'xlsx'
    elif file_name.endswith('.xls'):
        file_type = 'xls'
    else:
        raise HTTPException(status_code=400, detail="지원하지 않는 파일 형식 (CSV, XLSX, XLS만 가능)")

    # 파일 읽기
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="파일이 비어있습니다")

    # 파일 크기 검증 (10MB 제한)
    max_size = 10 * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(status_code=413, detail=f"파일 크기 초과 (최대 {max_size / 1024 / 1024:.0f}MB)")

    # 임포트 실행
    result = inquiry_service.import_inquiries(db, user.id, content, file_type)
    return {"data": result}
