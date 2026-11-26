import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import type { Editor } from '@tiptap/core';
import { LogReferencePanel } from './LogReferencePanel';

interface Props {
  editor: Editor | null;
  onClose: () => void;
}

const STORAGE_SIZE_KEY = 'sw-log-reference-popup-size';
const STORAGE_POS_KEY = 'sw-log-reference-popup-pos';
const MIN_WIDTH = 640;
const MIN_HEIGHT = 480;
const DEFAULT_WIDTH = 1040;
const DEFAULT_HEIGHT = 760;
const EDGE_GAP = 24;

type PopupSize = { width: number; height: number };
type PopupPos = { left: number; top: number };

function clampSize(width: number, height: number) {
  const maxWidth = Math.max(MIN_WIDTH, window.innerWidth - EDGE_GAP * 2);
  const maxHeight = Math.max(MIN_HEIGHT, window.innerHeight - EDGE_GAP * 2);
  return {
    width: Math.min(maxWidth, Math.max(MIN_WIDTH, width)),
    height: Math.min(maxHeight, Math.max(MIN_HEIGHT, height)),
  };
}

function clampPos(left: number, top: number, width: number, height: number) {
  const maxLeft = Math.max(EDGE_GAP, window.innerWidth - width - EDGE_GAP);
  const maxTop = Math.max(EDGE_GAP, window.innerHeight - height - EDGE_GAP);
  return {
    left: Math.min(maxLeft, Math.max(EDGE_GAP, left)),
    top: Math.min(maxTop, Math.max(EDGE_GAP, top)),
  };
}

function getInitialSize(): PopupSize {
  if (typeof window === 'undefined') return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };

  try {
    const raw = localStorage.getItem(STORAGE_SIZE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.width === 'number' && typeof parsed?.height === 'number') {
        return clampSize(parsed.width, parsed.height);
      }
    }
  } catch {
    // ignore
  }

  return clampSize(Math.min(DEFAULT_WIDTH, Math.round(window.innerWidth * 0.5)), DEFAULT_HEIGHT);
}

function getInitialPos(size: PopupSize): PopupPos {
  if (typeof window === 'undefined') return { left: EDGE_GAP, top: EDGE_GAP };

  try {
    const raw = localStorage.getItem(STORAGE_POS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.left === 'number' && typeof parsed?.top === 'number') {
        return clampPos(parsed.left, parsed.top, size.width, size.height);
      }
    }
  } catch {
    // ignore
  }

  // 저장된 위치가 없으면 오른쪽에 붙여, 왼쪽의 일지·작성 화면을 가리지 않게 한다
  return clampPos(
    window.innerWidth - size.width - EDGE_GAP,
    Math.round((window.innerHeight - size.height) / 2),
    size.width,
    size.height,
  );
}

export function LogReferencePanelPopup({ editor, onClose }: Props) {
  const [size, setSize] = useState<PopupSize>(getInitialSize);
  const [pos, setPos] = useState<PopupPos>(() => getInitialPos(getInitialSize()));
  const resizeRef = useRef<{
    dir: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);
  const moveRef = useRef<{
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SIZE_KEY, JSON.stringify(size));
    } catch {
      // ignore
    }
  }, [size]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_POS_KEY, JSON.stringify(pos));
    } catch {
      // ignore
    }
  }, [pos]);

  useEffect(() => {
    const handleResize = () => {
      setSize(prev => {
        const next = clampSize(prev.width, prev.height);
        setPos(current => clampPos(current.left, current.top, next.width, next.height));
        return next;
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  function startResize(dir: string) {
    return (event: ReactMouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      resizeRef.current = {
        dir,
        startX: event.clientX,
        startY: event.clientY,
        startWidth: size.width,
        startHeight: size.height,
      };

      const handleMove = (moveEvent: MouseEvent) => {
        const drag = resizeRef.current;
        if (!drag) return;

        const dx = moveEvent.clientX - drag.startX;
        const dy = moveEvent.clientY - drag.startY;
        let nextWidth = drag.startWidth;
        let nextHeight = drag.startHeight;
        let nextLeft = pos.left;
        let nextTop = pos.top;

        if (drag.dir.includes('e')) nextWidth = drag.startWidth + dx;
        if (drag.dir.includes('w')) {
          nextWidth = drag.startWidth - dx;
          nextLeft = pos.left + dx;
        }
        if (drag.dir.includes('s')) nextHeight = drag.startHeight + dy;
        if (drag.dir.includes('n')) {
          nextHeight = drag.startHeight - dy;
          nextTop = pos.top + dy;
        }

        const clamped = clampSize(nextWidth, nextHeight);
        setSize(clamped);
        setPos(clampPos(nextLeft, nextTop, clamped.width, clamped.height));
      };

      const handleUp = () => {
        resizeRef.current = null;
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    };
  }

  function startMove(event: ReactMouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    moveRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: pos.left,
      startTop: pos.top,
    };

    const handleMove = (moveEvent: MouseEvent) => {
      const drag = moveRef.current;
      if (!drag) return;
      const next = clampPos(
        drag.startLeft + (moveEvent.clientX - drag.startX),
        drag.startTop + (moveEvent.clientY - drag.startY),
        size.width,
        size.height,
      );
      setPos(next);
    };

    const handleUp = () => {
      moveRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[450]">
      <div
        className="pointer-events-auto absolute overflow-hidden rounded-2xl border border-emerald-500/70 bg-white shadow-2xl dark:border-emerald-300/45 dark:bg-slate-900 v2:rounded-md v2:border-[var(--v2-line)] v2:bg-[var(--v2-panel)] v2:shadow-xl"
        style={{ left: pos.left, top: pos.top, width: size.width, height: size.height }}
      >
        <div
          className="absolute left-24 right-24 top-1 z-20 h-6 cursor-move rounded-full bg-slate-200/80 dark:bg-slate-700/70"
          onMouseDown={startMove}
          title="드래그해서 이동"
        >
          <div className="mx-auto mt-[9px] h-1 w-24 rounded-full bg-slate-300 dark:bg-slate-500" />
        </div>

        <div className="h-full min-h-0 flex-1 pt-3">
          <LogReferencePanel editor={editor} collapsed={false} />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-30 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1 text-[11px] font-medium text-slate-500 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          닫기
        </button>

        <div className="pointer-events-none absolute inset-0">
          <div className="pointer-events-auto absolute left-0 right-0 top-0 h-[12px] cursor-n-resize" onMouseDown={startResize('n')} />
          <div className="pointer-events-auto absolute left-0 right-0 bottom-0 h-[12px] cursor-s-resize" onMouseDown={startResize('s')} />
          <div className="pointer-events-auto absolute top-0 bottom-0 left-0 w-[12px] cursor-w-resize" onMouseDown={startResize('w')} />
          <div className="pointer-events-auto absolute top-0 bottom-0 right-0 w-[12px] cursor-e-resize" onMouseDown={startResize('e')} />
          <div className="pointer-events-auto absolute left-0 top-0 h-[18px] w-[18px] cursor-nw-resize" onMouseDown={startResize('nw')} />
          <div className="pointer-events-auto absolute right-0 top-0 h-[18px] w-[18px] cursor-ne-resize" onMouseDown={startResize('ne')} />
          <div className="pointer-events-auto absolute left-0 bottom-0 h-[18px] w-[18px] cursor-sw-resize" onMouseDown={startResize('sw')} />
          <div className="pointer-events-auto absolute right-0 bottom-0 h-[18px] w-[18px] cursor-se-resize" onMouseDown={startResize('se')} />
        </div>

        <div className="pointer-events-none absolute left-0 top-0 h-[18px] w-[18px] rounded-br-xl border-b border-r border-emerald-400/60 v2:hidden" />
        <div
          className="pointer-events-none absolute bottom-1 right-1 h-3 w-3 text-emerald-500/70 dark:text-emerald-300/60"
          aria-hidden
        >
          <svg viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 2 L2 10 M10 6 L6 10 M10 10 L10 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}
