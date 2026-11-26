"""WebSocket 연결 관리 (Phase 9에서 본격 구현)."""
from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # user_id → list of WebSocket (다중 탭 대응)
        self._connections: dict[int, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, user_id: int) -> None:
        await websocket.accept()
        self._connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int) -> None:
        conns = self._connections.get(user_id, [])
        if websocket in conns:
            conns.remove(websocket)

    async def send_to_user(self, user_id: int, message: dict) -> None:
        for ws in list(self._connections.get(user_id, [])):
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(ws, user_id)

    async def broadcast(self, message: dict) -> None:
        for user_id in list(self._connections.keys()):
            await self.send_to_user(user_id, message)


manager = ConnectionManager()
