"""근무편성 자료 API — 로그인한 근무자 누구나 읽고 쓴다(관리자 제한 없음).

GET  /api/duty-roster[?meta=1]        → {exists, rev, saved_at, counts, prev, data(meta 가 아닐 때)}
PUT  /api/duty-roster                 ← {base_rev, data, snapshot?}  판이 다르면 409 {detail: {code, rev, saved_at}}
POST /api/duty-roster/restore-prev    ← {base_rev}        직전 판과 현재를 맞바꾸고 {rev, saved_at, prev, data}
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.duty_roster import RosterRestore, RosterSave
from app.services import duty_roster_service as svc

router = APIRouter(prefix="/api/duty-roster", tags=["duty-roster"])
logger = logging.getLogger(__name__)


def _run(fn, *args):
    try:
        return fn(*args)
    except svc.RosterConflict as e:
        raise HTTPException(409, detail={"code": "conflict", "rev": e.rev, "saved_at": e.saved_at})
    except svc.RosterTooLarge as e:
        raise HTTPException(413, detail=str(e))
    except svc.RosterInvalid as e:
        raise HTTPException(400, detail=str(e))


@router.get("")
def get_roster(response: Response, meta: bool = False,
               db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    response.headers["Cache-Control"] = "no-store"
    return svc.get_roster(db, meta_only=meta)


@router.put("")
def save_roster(body: RosterSave, request: Request,
                db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    if int(request.headers.get("content-length") or 0) > svc.MAX_BYTES:
        raise HTTPException(413, detail="근무편성 자료가 너무 큽니다.")
    out = _run(svc.save_roster, db, body.base_rev, body.data, body.snapshot)
    logger.info("duty roster saved rev=%s user_id=%s", out["rev"], me.id)
    return out


@router.post("/restore-prev")
def restore_prev(body: RosterRestore, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    out = _run(svc.restore_prev, db, body.base_rev)
    logger.info("duty roster restored prev rev=%s user_id=%s", out["rev"], me.id)
    return out
