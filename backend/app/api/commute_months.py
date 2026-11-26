"""통근비 계산기 달별 근태 자료 API — 로그인한 근무자가 누구나 올리고·보고·지운다(관리자 제한 없음).

GET    /api/commute-calc/months        → [{ym, file_name, row_count, uploaded_at, uploaded_by_name}]
GET    /api/commute-calc/months/{ym}   → {ym, rows}
PUT    /api/commute-calc/months        ← {file_name, months: {"YYYY-MM": [rows]}}  파일에 든 달만 덮어씀
DELETE /api/commute-calc/months/{ym}
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.commute_calc import CommuteMonthsUpload
from app.services import commute_month_service as svc

router = APIRouter(prefix="/api/commute-calc/months", tags=["commute-calc"])
logger = logging.getLogger(__name__)
MAX_UPLOAD_BYTES = 30 * 1024 * 1024


@router.get("")
def list_months(response: Response, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    response.headers["Cache-Control"] = "no-store"
    return svc.list_months(db)


@router.get("/{ym}")
def get_month(ym: str, response: Response, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    response.headers["Cache-Control"] = "no-store"
    try:
        out = svc.get_month(db, ym)
    except svc.MonthInvalid as e:
        raise HTTPException(400, detail=str(e))
    if out is None:
        raise HTTPException(404, detail="저장된 자료가 없는 달입니다.")
    return out


@router.put("")
def save_months(body: CommuteMonthsUpload, request: Request,
                db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    if int(request.headers.get("content-length") or 0) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, detail="올린 근태 자료가 너무 큽니다.")
    try:
        saved = svc.save_months(db, body, me.id)
    except svc.MonthInvalid as e:
        raise HTTPException(400, detail=str(e))
    except svc.MonthBusy as e:
        raise HTTPException(409, detail=str(e))
    logger.info("commute months saved months=%s user_id=%s", ",".join(saved), me.id)
    return {"saved": saved, "months": svc.list_months(db)}


@router.delete("/{ym}")
def delete_month(ym: str, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    try:
        ok = svc.delete_month(db, ym)
    except svc.MonthInvalid as e:
        raise HTTPException(400, detail=str(e))
    if not ok:
        raise HTTPException(404, detail="저장된 자료가 없는 달입니다.")
    logger.info("commute month deleted ym=%s user_id=%s", svc.norm_ym(ym), me.id)
    return {"months": svc.list_months(db)}
