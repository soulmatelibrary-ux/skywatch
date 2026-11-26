// 일지 보기 팝업 오른쪽에 붙는 참고 일지 패널(도킹 분할) — 왼쪽 일지는 그대로 읽고 스크롤할 수 있다
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import type { Editor } from '@tiptap/core';
import { LogReferencePanel } from './LogReferencePanel';

interface Props {
  editor: Editor | null;
  onClose: () => void;
}

const STORAGE_KEY = 'sw-log-reference-dock-width';
const MIN_WIDTH = 360;
const MAX_WIDTH = 600;
const KEY_STEP = 16;

// 창 폭의 45% 까지만 — 960px 반쪽 창에서도 왼쪽 일지가 480px 아래로 줄지 않게 한다
function maxWidth() {
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.floor(window.innerWidth * 0.45)));
}

function clampWidth(width: number) {
  return Math.min(maxWidth(), Math.max(MIN_WIDTH, Math.round(width)));
}

function initialWidth() {
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(saved) && saved > 0) return clampWidth(saved);
  } catch {
    // 저장소를 못 쓰면 기본 폭
  }
  return clampWidth(Math.min(520, Math.max(400, window.innerWidth * 0.42)));
}

export function LogRefDock({ editor, onClose }: Props) {
  const [width, setWidth] = useState(initialWidth);
  const asideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(width));
    } catch {
      // 저장 실패는 무시
    }
  }, [width]);

  useEffect(() => {
    const onResize = () => setWidth(prev => clampWidth(prev));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  function startDrag(event: ReactMouseEvent) {
    event.preventDefault();
    const right = asideRef.current?.getBoundingClientRect().right ?? window.innerWidth;
    const move = (e: MouseEvent) => setWidth(clampWidth(right - e.clientX));
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') setWidth(prev => clampWidth(prev + KEY_STEP));
    else if (event.key === 'ArrowRight') setWidth(prev => clampWidth(prev - KEY_STEP));
    else return;
    event.preventDefault();
  }

  return (
    <>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="참고 일지 폭 조절 (← → 키)"
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={maxWidth()}
        aria-valuenow={width}
        tabIndex={0}
        title="좌우로 끌거나 ← → 키로 폭 조절"
        onMouseDown={startDrag}
        onKeyDown={onKeyDown}
        className="group relative w-[9px] shrink-0 cursor-col-resize outline-none"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-200 transition group-hover:w-[3px] group-hover:bg-[var(--v2-accent,#3b82f6)] group-focus-visible:w-[3px] group-focus-visible:bg-[var(--v2-accent,#3b82f6)] dark:bg-slate-700 v2:bg-[var(--v2-line)]"
        />
      </div>
      <aside
        ref={asideRef}
        role="complementary"
        aria-label="참고 일지"
        style={{ width }}
        className="flex min-h-0 shrink-0 flex-col overflow-hidden bg-white dark:bg-slate-900 v2:bg-[var(--v2-panel)]"
      >
        <div className="min-h-0 flex-1">
          <LogReferencePanel editor={editor} onClose={onClose} />
        </div>
      </aside>
    </>
  );
}
