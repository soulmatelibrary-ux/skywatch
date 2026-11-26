import { useEffect } from 'react';

/** 일지 팝업 창에서 저장하면(BroadcastChannel) 메인 창 업무일지 목록을 다시 읽게 알린다 — 상단 바에 한 번만 둔다 */
export function useLogReloadBridge() {
  useEffect(() => {
    const ch = new BroadcastChannel('skywatch-log');
    ch.onmessage = (e) => {
      if (e.data?.type === 'log-saved' || e.data?.type === 'logs-reload') {
        window.dispatchEvent(new CustomEvent('logs:reload'));
      }
    };
    return () => ch.close();
  }, []);
}
