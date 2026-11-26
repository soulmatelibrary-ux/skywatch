import { useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';

/** 끌어서 너비를 바꾸는 패널 — 너비는 localStorage 에 기억 */
export function useResizableWidth(storageKey: string, initial: number, min: number, max: number) {
  const [width, setWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(storageKey));
      return saved ? Math.max(min, Math.min(max, saved)) : initial;
    } catch { return initial; }
  });
  const drag = useRef<{ x: number; w: number } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current) return;
      setWidth(Math.max(min, Math.min(max, drag.current.w + e.clientX - drag.current.x)));
    };
    const onUp = () => {
      if (!drag.current) return;
      drag.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setWidth(w => { try { localStorage.setItem(storageKey, String(w)); } catch { /* 저장 불가 무시 */ } return w; });
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [storageKey, min, max]);

  const startDrag = (e: ReactMouseEvent) => {
    drag.current = { x: e.clientX, w: width };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };
  return { width, startDrag };
}

/** 팝업 창 위치·크기를 기억 (다음에 같은 자리로 열기) */
export function usePopupBounds(storageKey: string) {
  useEffect(() => {
    const save = () => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({
          left: window.screenX, top: window.screenY, width: window.outerWidth, height: window.outerHeight,
        }));
      } catch { /* 저장 불가 무시 */ }
    };
    window.addEventListener('beforeunload', save);
    window.addEventListener('resize', save);
    return () => { window.removeEventListener('beforeunload', save); window.removeEventListener('resize', save); };
  }, [storageKey]);
}

/** 팝업 창도 메인 창의 라이트/다크 설정을 따르고, 메인 창에서 바꾸면 바로 반영 */
export function usePopupTheme() {
  useEffect(() => {
    const apply = () => {
      let theme = 'dark';
      try { theme = localStorage.getItem('skywatch-theme') ?? 'dark'; } catch { /* 기본 다크 */ }
      document.documentElement.classList.toggle('dark', theme === 'dark');
      document.documentElement.style.colorScheme = theme;
    };
    apply();
    const onStorage = (e: StorageEvent) => { if (e.key === 'skywatch-theme') apply(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
}
