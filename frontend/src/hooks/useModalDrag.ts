import { useRef, useState } from 'react';

const WIDTH_PRESETS = [800, 1000, 1200, 1440, 1700];
const DEFAULT_IDX = 2;
const WIDTH_IDX_KEY = 'sw-modal-detail-width-idx';

export function useModalDrag() {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [widthIdx, setWidthIdx] = useState(() => {
    try { const s = localStorage.getItem(WIDTH_IDX_KEY); if (s !== null) { const i = parseInt(s, 10); if (i >= 0 && i < WIDTH_PRESETS.length) return i; } } catch {} return DEFAULT_IDX;
  });
  const dragRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  function handleDragStart(e: React.MouseEvent) {
    const rect = modalRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, startLeft: rect.left, startTop: rect.top };
  }

  function handleDragMove(e: React.MouseEvent) {
    if (!dragRef.current) return;
    setPos({
      left: dragRef.current.startLeft + (e.clientX - dragRef.current.startX),
      top: Math.max(0, dragRef.current.startTop + (e.clientY - dragRef.current.startY)),
    });
  }

  function handleDragEnd() { dragRef.current = null; }

  function narrower() { setWidthIdx(i => { const n = Math.max(0, i - 1); localStorage.setItem(WIDTH_IDX_KEY, String(n)); return n; }); }
  function wider() { setWidthIdx(i => { const n = Math.min(WIDTH_PRESETS.length - 1, i + 1); localStorage.setItem(WIDTH_IDX_KEY, String(n)); return n; }); }

  const width = `min(${WIDTH_PRESETS[widthIdx]}px, calc(100vw - 32px))`;
  const modalStyle = pos
    ? { position: 'fixed' as const, left: pos.left, top: pos.top, width }
    : { width };

  return {
    modalRef, modalStyle, handleDragStart, handleDragMove, handleDragEnd,
    narrower, wider,
    isNarrowest: widthIdx === 0,
    isWidest: widthIdx === WIDTH_PRESETS.length - 1,
  };
}
