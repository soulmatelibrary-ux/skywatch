"""카드 상태 변경 / 인라인 편집 / 링크 검색 / 연결 체인 / 첨부파일 API."""
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.log import LogCard
from app.models.work_thread import WorkThreadCard

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.log import (
    AttachmentOut, CardChainNode, CardLinkResult, CardStatusPatch, CardUpdate, LinkToChainRequest, LogCardOut,
)
from app.services import attachment_service, card_edit_service, card_service, carry_over_card_service
from app.services.card_vector_service import schedule_vectorize_card

router = APIRouter(prefix="/api/cards", tags=["cards"])


@router.get("/{card_id}", response_model=ApiResponse[LogCardOut])
def get_card(
    card_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from app.services.card_service import _card_to_out, CardNotFoundError
    try:
        card = card_service.get_card_by_id(db, card_id)
    except CardNotFoundError:
        raise HTTPException(status_code=404, detail="카드를 찾을 수 없습니다")
    return ApiResponse.ok(data=_card_to_out(card, db))


@router.delete("/{card_id}", response_model=ApiResponse[None])
def delete_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.card_service import CardNotFoundError
    try:
        card = card_service.soft_delete_card(db, card_id, current_user.id)
        # 삭제된 카드가 일지 제목 출처였으면 남은 첫 카드 제목으로 갱신
        from app.services.shift_card_edit_service import _refresh_log_title
        _refresh_log_title(db, card.log_id)
        # 이어지는 일에 연결된 카드면 묶음에서 분리 (근무일지 삭제와 같은 처리)
        from app.services import work_thread_sync as sync
        from app.services import work_thread_link_service as link_service
        from app.services import work_thread_card_status as card_status
        thread = sync.thread_of(db, card_id)
        if thread is not None and thread.kind == "thread":
            link_service.detach_card(db, thread, card_id, current_user.id)
            live = db.scalar(
                select(func.count()).select_from(WorkThreadCard)
                .where(WorkThreadCard.thread_id == thread.id)
                .join(LogCard, LogCard.id == WorkThreadCard.card_id)
                .where(LogCard.is_deleted.is_(False))
            )
            if not live:
                card_status.sync_thread(db, thread, "done", current_user.id)
        db.commit()
    except CardNotFoundError:
        raise HTTPException(status_code=404, detail="카드를 찾을 수 없습니다")
    return ApiResponse.ok(data=None)


@router.get("/{card_id}/attachments", response_model=ApiResponse[list[AttachmentOut]])
def list_attachments(
    card_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    atts = attachment_service.list_for_card(db, card_id)
    return ApiResponse.ok(data=[AttachmentOut.from_orm_attachment(a) for a in atts])


@router.post("/{card_id}/carry-over", response_model=ApiResponse[LogCardOut])
def carry_over_card(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """미완료 카드를 오늘 일지로 원클릭 이월."""
    try:
        result = carry_over_card_service.carry_over_card(db, card_id, current_user.id)
        return ApiResponse.ok(data=result, message="카드가 이월되었습니다.")
    except carry_over_card_service.CarryOverError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/link-search", response_model=ApiResponse[list[CardLinkResult]])
def link_search(
    q: str = Query(..., min_length=1, max_length=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ApiResponse.ok(data=card_edit_service.search_links(db, q, current_user.id))


@router.patch("/{card_id}", response_model=ApiResponse[LogCardOut])
def update_card(
    card_id: int,
    body: CardUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = card_edit_service.update_card(db, card_id, current_user.id, body)
    if not result:
        raise HTTPException(status_code=404, detail="카드를 찾을 수 없습니다")
    schedule_vectorize_card(card_id)
    return ApiResponse.ok(data=result)


@router.patch("/{card_id}/status", response_model=ApiResponse[LogCardOut])
def update_card_status(
    card_id: int,
    body: CardStatusPatch,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = card_service.set_card_status(db, card_id, current_user.id, body.status)
    if not result:
        raise HTTPException(status_code=404, detail="카드를 찾을 수 없습니다")
    return ApiResponse.ok(data=result)


@router.patch("/{card_id}/complete-chain", response_model=ApiResponse[None])
def complete_chain(
    card_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    card_edit_service.complete_chain(db, card_id, current_user.id)
    return ApiResponse.ok(data=None, message="체인 전체 완료 처리되었습니다.")


@router.post("/{card_id}/chain", response_model=ApiResponse[None])
def link_to_chain(
    card_id: int,
    body: LinkToChainRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        card_edit_service.link_card_to_chain(db, card_id, body.target_card_id, current_user.id)
        return ApiResponse.ok(data=None, message="카드가 체인에 추가되었습니다.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{card_id}/chain", response_model=ApiResponse[None])
def unlink_card_from_chain(
    card_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    card_edit_service.unlink_card_from_chain(db, card_id)
    return ApiResponse.ok(data=None, message="체인 연결이 해제되었습니다.")


@router.get("/{card_id}/chain", response_model=ApiResponse[list[CardChainNode]])
def get_chain(
    card_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return ApiResponse.ok(data=card_edit_service.get_card_chain(db, card_id))


@router.post("/{card_id}/attachments", response_model=ApiResponse[AttachmentOut])
async def upload_attachment(
    card_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        att = await attachment_service.upload(db, card_id, current_user.id, file)
        return ApiResponse.ok(data=AttachmentOut.from_orm_attachment(att))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/attachments/{attachment_id}", response_model=ApiResponse[None])
def delete_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        if not attachment_service.delete(db, attachment_id, current_user.id):
            raise HTTPException(status_code=404, detail="첨부파일을 찾을 수 없습니다")
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    return ApiResponse.ok(data=None)
