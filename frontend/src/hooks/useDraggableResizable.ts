import { useCallback, useEffect, useRef, useState } from 'react';

interface Size { width: number; height: number; }
interface Pos { x: number; y: number; }

const MIN_Y = 0;   // 화면 최상단까지 이동 허용
const MIN_X = 0;
const MIN_W = 520;
const MIN_H = 420;

export type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export function useDraggableResizable(initialSize: Size = { width: 1200, height: 700 }, storageKey?: string) {
  const [size, setSize] = useState<Size>(() => {
    try {
      const raw = storageKey && localStorage.getItem(storageKey);
      if (!raw) return initialSize;
      const parsed = JSON.parse(raw);

      // 기존 포맷(사이즈만 저장: {width, height}) 호환
      if (typeof parsed?.width === 'number' && typeof parsed?.height === 'number') {
        return { width: parsed.width, height: parsed.height };
      }

      // 신규 포맷({size, pos}) 지원
      if (typeof parsed?.size?.width === 'number' && typeof parsed?.size?.height === 'number') {
        return { width: parsed.size.width, height: parsed.size.height };
      }
    } catch { /* ignore */ }
    return initialSize;
  });
  const [pos, setPos] = useState<Pos | null>(() => {
    try {
      const raw = storageKey && localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.pos?.x === 'number' && typeof parsed?.pos?.y === 'number') {
        return { x: parsed.pos.x, y: parsed.pos.y };
      }
    } catch { /* ignore */ }
    return null;
  });

  const posRef = useRef(pos);
  const sizeRef = useRef(size);
  useEffect(() => { posRef.current = pos; }, [pos]);
  useEffect(() => { sizeRef.current = size; }, [size]);

  function persistState(nextSize: Size, nextPos: Pos | null) {
    if (!storageKey) return;
    const payload = { size: nextSize, pos: nextPos };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  }

  function computePos(): Pos {
    const p = posRef.current;
    const s = sizeRef.current;
    if (p !== null) return p;
    return {
      x: Math.max(MIN_X, (window.innerWidth - s.width) / 2),
      y: MIN_Y,
    };
  }

  const onDragStart = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    const origPos = computePos();
    const startX = e.clientX, startY = e.clientY;

    function onMove(ev: MouseEvent) {
      const s = sizeRef.current;
      const newX = Math.max(MIN_X, Math.min(window.innerWidth - s.width, origPos.x + ev.clientX - startX));
      const newY = Math.max(MIN_Y, origPos.y + ev.clientY - startY);
      setPos({ x: newX, y: newY });
    }
    function onUp() {
      persistState(sizeRef.current, posRef.current);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [storageKey]);

  const onResizeStart = useCallback((dir: ResizeDir) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const origSize = { ...sizeRef.current };
    const origPos = computePos();
    const startX = e.clientX, startY = e.clientY;

    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let { x, y } = origPos;
      let w = origSize.width;
      let h = origSize.height;

      if (dir.includes('e')) w = Math.min(window.innerWidth - origPos.x, Math.max(MIN_W, w + dx));
      if (dir.includes('s')) h = Math.min(window.innerHeight - origPos.y, Math.max(MIN_H, h + dy));
      if (dir.includes('w')) {
        const newX = Math.max(MIN_X, origPos.x + dx);
        w = Math.max(MIN_W, origPos.x + origSize.width - newX);
        x = origPos.x + origSize.width - w;
      }
      if (dir.includes('n')) {
        const newY = Math.max(MIN_Y, origPos.y + dy);
        h = Math.max(MIN_H, origPos.y + origSize.height - newY);
        y = origPos.y + origSize.height - h;
      }

      setSize({ width: w, height: h });
      setPos({ x, y });
    }
    function onUp() {
      persistState(sizeRef.current, posRef.current);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [storageKey]);

  const actualPos: Pos = pos ?? {
    x: Math.max(MIN_X, (window.innerWidth - size.width) / 2),
    y: MIN_Y,
  };

  return { pos: actualPos, size, onDragStart, onResizeStart };
}
