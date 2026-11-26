"""알림 API 라우터."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.notification import NotificationOut
from app.services import notification_service

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=ApiResponse[list[NotificationOut]])
def get_notifications(
    unread_only: bool = False,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    q: str = Query(""),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    items, pagination = notification_service.list_notifications(
        db, me.id, unread_only, page, per_page, q, date_from, date_to
    )
    return ApiResponse.ok(data=items, pagination=pagination)


@router.post("/{notif_id}/read", response_model=ApiResponse[None])
def mark_read(
    notif_id: int,
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    notification_service.mark_read(db, notif_id, me.id)
    return ApiResponse.ok()


@router.post("/read-all", response_model=ApiResponse[None])
def mark_all_read(
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    notification_service.mark_all_read(db, me.id)
    return ApiResponse.ok()


@router.delete("/read", response_model=ApiResponse[int])
def delete_read(
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    count = notification_service.delete_read_notifications(db, me.id)
    return ApiResponse.ok(data=count)


@router.delete("/{notif_id}", response_model=ApiResponse[None])
def delete_one(
    notif_id: int,
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    notification_service.delete_notification(db, notif_id, me.id)
    return ApiResponse.ok()
