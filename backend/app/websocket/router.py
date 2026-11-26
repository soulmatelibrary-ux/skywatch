"""WebSocket 엔드포인트."""
from fastapi import APIRouter, Cookie, WebSocket, WebSocketDisconnect

from app.db.session import SessionLocal
from app.services import auth_service, notification_service
from app.websocket.manager import manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/notifications")
async def ws_notifications(
    websocket: WebSocket,
    session_token: str | None = Cookie(default=None),
):
    """httpOnly 쿠키(session_token)로 인증 후 알림 스트림 연결."""
    # ── 인증 (DB 세션은 인증 후 즉시 닫음) ─────────────────────────────────
    db = SessionLocal()
    try:
        user = auth_service.get_session_user(db, session_token) if session_token else None
        if user is None:
            await websocket.close(code=4001)
            return
        user_id = user.id
        unread = notification_service.count_unread(db, user_id)
    finally:
        db.close()

    # ── WebSocket 연결 수락 + 초기 미읽음 수 전송 ───────────────────────────
    await manager.connect(websocket, user_id)
    await websocket.send_json({"type": "unread_count", "count": unread})

    # ── 메시지 루프 (ping 수신으로 연결 유지) ───────────────────────────────
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
