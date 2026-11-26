import { useEffect, useRef } from 'react';

const CHANNEL = 'skywatch-log';

/** 기존 업무일지 화면·팝업과 같은 채널로 "일지가 바뀜"을 알린다. */
export function notifyLogChange(): void {
  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.postMessage({ type: 'logs-reload' });
    ch.close();
  } catch { /* BroadcastChannel 미지원 환경은 무시 */ }
}

/** 다른 창(기존 작성·보기 팝업 등)에서 일지가 저장되면 onChange를 호출한다. */
export function useLogChannel(onChange: () => void): void {
  const ref = useRef(onChange);
  ref.current = onChange;
  useEffect(() => {
    try {
      const ch = new BroadcastChannel(CHANNEL);
      ch.onmessage = () => ref.current();
      return () => ch.close();
    } catch {
      return undefined;
    }
  }, []);
}

/** 같은 근무를 신규 근무일지 보기 화면으로 연다. 팝업에서 열면 원래 창으로 보낸다. */
export function openShiftRead(date: string, shift: string): void {
  const url = `/shift/read?date=${date}&shift=${encodeURIComponent(shift)}`;
  const opener = window.opener as Window | null;
  if (opener && !opener.closed) {
    opener.location.href = url;
    opener.focus();
    return;
  }
  window.location.assign(url);
}
