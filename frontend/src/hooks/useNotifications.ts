import { useCallback, useEffect, useRef } from 'react';
import { notificationApi } from '../services/api/notificationApi';
import { useNotifStore } from '../store/notifStore';

const WS_URL = `ws://${window.location.hostname}:8000/ws/notifications`;
const MAX_BACKOFF = 30_000;

/** AppLayout에서 한 번만 마운트 — WebSocket 연결 + 알림 초기 로드 */
export function useNotifInit() {
  const { setNotifications, increment } = useNotifStore();
  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(1000);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAll = useCallback(async () => {
    const res = await notificationApi.list({ page: 1, perPage: 20 });
    setNotifications(res.data.data ?? []);
  }, [setNotifications]);

  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => { backoffRef.current = 1000; };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'unread_count') {
          useNotifStore.getState().setUnreadCount(msg.count);
        } else if (msg.type === 'notification') {
          increment();
          fetchAll();
        }
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      retryRef.current = setTimeout(() => {
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);
        connectWs();
      }, backoffRef.current);
    };

    ws.onerror = () => ws.close();
  }, [increment, fetchAll]);

  useEffect(() => {
    fetchAll();
    connectWs();
    const ping = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send('ping');
    }, 25_000);

    return () => {
      clearInterval(ping);
      if (retryRef.current) clearTimeout(retryRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      }
    };
  }, [fetchAll, connectWs]);
}

/** 어디서든 알림 데이터 + 액션 사용 */
export function useNotifications() {
  const { notifications, patchRead, markAllRead: storeMarkAllRead, removeOne, removeRead } = useNotifStore();

  const markRead = useCallback(async (id: number) => {
    await notificationApi.markRead(id);
    patchRead(id, new Date().toISOString());
  }, [patchRead]);

  const markAllRead = useCallback(async () => {
    await notificationApi.markAllRead();
    storeMarkAllRead(new Date().toISOString());
  }, [storeMarkAllRead]);

  const deleteNotif = useCallback(async (id: number) => {
    await notificationApi.deleteOne(id);
    removeOne(id);
  }, [removeOne]);

  const deleteRead = useCallback(async () => {
    await notificationApi.deleteRead();
    removeRead();
  }, [removeRead]);

  return { notifications, markRead, markAllRead, deleteNotif, deleteRead };
}
