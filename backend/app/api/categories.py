"""카테고리 CRUD API."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.log import CardCategoryCreate, CardCategoryOut, CardCategoryUpdate
from app.services import category_service

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=ApiResponse[list[CardCategoryOut]])
def list_categories(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return ApiResponse.ok(data=category_service.list_categories(db))


@router.post("", response_model=ApiResponse[CardCategoryOut], status_code=201)
def create_category(
    body: CardCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ApiResponse.ok(data=category_service.create_category(db, current_user.id, body))


@router.put("/{cat_id}", response_model=ApiResponse[CardCategoryOut])
def update_category(
    cat_id: int,
    body: CardCategoryUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = category_service.update_category(db, cat_id, body)
    if not result:
        raise HTTPException(status_code=404, detail="카테고리를 찾을 수 없습니다")
    return ApiResponse.ok(data=result)


@router.delete("/{cat_id}", response_model=ApiResponse[None])
def delete_category(
    cat_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not category_service.delete_category(db, cat_id, current_user.id):
        raise HTTPException(status_code=404, detail="카테고리를 찾을 수 없습니다")
    return ApiResponse.ok(data=None)
