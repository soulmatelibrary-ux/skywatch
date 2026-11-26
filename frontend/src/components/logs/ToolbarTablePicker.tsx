// 표 삽입 크기 선택 팝업 (8×8)
import { useState } from 'react';

const COLS = 8;
const ROWS = 8;

interface Props {
  pos: { top: number; left: number };
  onInsert: (rows: number, cols: number) => void;
}

export function ToolbarTablePicker({ pos, onInsert }: Props) {
  const [hover, setHover] = useState({ r: 0, c: 0 });
  return (
    <div
      className="fixed z-50 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900"
      style={{ top: pos.top + 8, left: pos.left }}
    >
      <div className="mb-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 min-w-[120px]">
        {hover.r > 0 ? `${hover.r} × ${hover.c} 표 삽입` : '표 크기 선택'}
      </div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${COLS}, 20px)` }}
        onMouseLeave={() => setHover({ r: 0, c: 0 })}
      >
        {Array.from({ length: ROWS * COLS }, (_, i) => {
          const r = Math.floor(i / COLS) + 1;
          const c = (i % COLS) + 1;
          const sel = r <= hover.r && c <= hover.c;
          return (
            <button
              key={`${r}-${c}`}
              type="button"
              className={`h-5 w-5 rounded border transition ${
                sel
                  ? 'border-blue-500 bg-blue-100 dark:border-cyan-400 dark:bg-cyan-500/20'
                  : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:hover:bg-slate-800'
              }`}
              onMouseEnter={() => setHover({ r, c })}
              onMouseDown={e => { e.preventDefault(); onInsert(r, c); }}
            />
          );
        })}
      </div>
    </div>
  );
}
