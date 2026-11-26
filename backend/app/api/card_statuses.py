"""카드 상태 분류 CRUD API."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.log import CardStatusCreate, CardStatusOut, CardStatusUpdate
from app.services import card_status_service

router = APIRouter(prefix="/api/card-statuses", tags=["card-statuses"])


@router.get("", response_model=ApiResponse[list[CardStatusOut]])
def list_statuses(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return ApiResponse.ok(data=card_status_service.list_statuses(db))


@router.post("", response_model=ApiResponse[CardStatusOut], status_code=201)
def create_status(
    body: CardStatusCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = card_status_service.create_status(db, current_user.id, body)
    if not result:
        raise HTTPException(status_code=409, detail="이미 사용 중인 키입니다")
    return ApiResponse.ok(data=result)


@router.put("/{status_id}", response_model=ApiResponse[CardStatusOut])
def update_status(
    status_id: int,
    body: CardStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = card_status_service.update_status(db, status_id, body)
    if not result:
        raise HTTPException(status_code=404, detail="상태를 찾을 수 없습니다")
    return ApiResponse.ok(data=result)


@router.delete("/{status_id}", response_model=ApiResponse[None])
def delete_status(
    status_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    err = card_status_service.delete_status(db, status_id, current_user.id)
    if err:
        code = 404 if err == "상태를 찾을 수 없습니다" else 409
        raise HTTPException(status_code=code, detail=err)
    return ApiResponse.ok(data=None)
