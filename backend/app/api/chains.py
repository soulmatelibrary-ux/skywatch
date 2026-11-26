"""연결된 카드 체인 목록 API."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.log import ChainInfo
from app.services.chain_service import get_all_chains

router = APIRouter(prefix="/api/chains", tags=["chains"])


@router.get("", response_model=ApiResponse[list[ChainInfo]])
def list_chains(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """연결된 카드 체인 목록을 조회합니다."""
    return ApiResponse.ok(data=get_all_chains(db))
