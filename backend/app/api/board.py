"""인계보드 API 라우터."""
from datetime import date as Date
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.log import BoardCategoryOut
from app.services import board_service

router = APIRouter(prefix="/api/board", tags=["board"])


@router.get("", response_model=ApiResponse[list[BoardCategoryOut]])
def get_board(
    team: Optional[str] = None,
    date_from: Optional[Date] = None,
    date_to: Optional[Date] = None,
    db: Session = Depends(get_db),
    _me: User = Depends(get_current_user),
):
    data = board_service.get_board(db, team=team, date_from=date_from, date_to=date_to)
    return ApiResponse.ok(data=data)
