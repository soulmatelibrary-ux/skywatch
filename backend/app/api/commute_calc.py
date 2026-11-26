"""통근비 계산기 설정·고친 칸 API — 로그인한 근무자 누구나 읽고 쓴다(관리자 제한 없음).

GET /api/commute-calc   → {exists, corrupt, rev, saved_at, data}
PUT /api/commute-calc   ← {base_rev, data}  → {rev, saved_at}. 판이 다르면 409 {detail: {code, rev, saved_at}}
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.commute_calc import CommuteCalcSave
from app.services import commute_calc_service as svc

router = APIRouter(prefix="/api/commute-calc", tags=["commute-calc"])
logger = logging.getLogger(__name__)


@router.get("")
def get_calc(response: Response, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    response.headers["Cache-Control"] = "no-store"
    return svc.get_calc(db)


@router.put("")
def save_calc(body: CommuteCalcSave, request: Request,
              db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    # 본문은 이미 읽고 검사(스키마)한 뒤라 메모리 보호는 아니다 — 큰 요청을 형식 검사 전에 일찍 413 으로 돌려줄 뿐
    if int(request.headers.get("content-length") or 0) > svc.MAX_BYTES:
        raise HTTPException(413, detail="통근비 계산기 자료가 너무 큽니다.")
    try:
        out = svc.save_calc(db, body.base_rev, body.data)
    except svc.DocConflict as e:
        raise HTTPException(409, detail={"code": "conflict", "rev": e.rev, "saved_at": e.saved_at})
    except svc.DocTooLarge as e:
        raise HTTPException(413, detail=str(e))
    except svc.DocInvalid as e:
        raise HTTPException(400, detail=str(e))
    logger.info("commute calc saved rev=%s user_id=%s", out["rev"], me.id)
    return out
