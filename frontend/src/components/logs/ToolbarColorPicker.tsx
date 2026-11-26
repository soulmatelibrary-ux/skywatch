// 툴바용 색상 선택 팝업 (글자색 / 형광펜)
import React from 'react';

interface Props {
  mode: 'text' | 'highlight';
  pos: { top: number; right?: number; left?: number };
  onSelect: (color: string) => void;
  onClear: () => void;
}

const TEXT_COLORS = [
  '#0f172a', '#374151', '#6b7280', '#cbd5e1',
  '#dc2626', '#ea580c', '#d97706', '#16a34a',
  '#2563eb', '#7c3aed', '#db2777', '#0891b2',
  '#b91c1c', '#92400e', '#065f46', '#1e3a8a',
];

const HIGHLIGHT_COLORS = [
  '#fef08a', '#fde68a', '#fed7aa', '#fca5a5',
  '#bbf7d0', '#bae6fd', '#c7d2fe', '#fce7f3',
  '#ecfeff', '#ede9fe', '#fff3cd', '#d1fae5',
  '#fee2e2', '#dbeafe', '#f5f3ff', '#fdf4ff',
];

export function ToolbarColorPicker({ mode, pos, onSelect, onClear }: Props) {
  const colors = mode === 'text' ? TEXT_COLORS : HIGHLIGHT_COLORS;
  const label = mode === 'text' ? '글자 색상' : '형광펜 색상';
  const clearLabel = mode === 'text' ? '색상 해제' : '형광펜 해제';
  const posStyle: React.CSSProperties = { top: pos.top + 8 };
  if (pos.right !== undefined) posStyle.right = pos.right;
  else if (pos.left !== undefined) posStyle.left = pos.left;

  return (
    <div
      className="fixed z-50 w-[192px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900"
      style={posStyle}
    >
      <div className="mb-2.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</div>
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {colors.map(color => (
          <button
            key={color}
            type="button"
            className="h-8 w-8 rounded-lg border border-slate-200 transition hover:scale-110 hover:shadow-md dark:border-slate-700"
            style={{ backgroundColor: color }}
            title={color}
            onMouseDown={e => { e.preventDefault(); onSelect(color); }}
          />
        ))}
      </div>
      <button
        type="button"
        className="w-full rounded-lg border border-slate-200 py-1.5 text-[11px] text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        onMouseDown={e => { e.preventDefault(); onClear(); }}
      >
        {clearLabel}
      </button>
    </div>
  );
}
