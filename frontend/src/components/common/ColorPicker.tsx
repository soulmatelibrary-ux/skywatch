import { useRef } from 'react';
import { COLOR_PRESETS } from '../../utils/colorUtils';

interface Props {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export function ColorPicker({ value, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const safeValue = value || '#6b7280';

  return (
    <div className="flex flex-col gap-1.5">
      {/* 추천 색상 팔레트 */}
      <div className="flex flex-wrap gap-1">
        {COLOR_PRESETS.map(c => (
          <button
            key={c}
            type="button"
            disabled={disabled}
            onClick={() => onChange(c)}
            title={c}
            className={[
              'w-4 h-4 rounded-full border-2 transition-transform hover:scale-110 disabled:cursor-not-allowed',
              safeValue === c
                ? 'border-slate-600 dark:border-slate-200 scale-110 shadow-sm ring-1 ring-offset-1 ring-slate-400 dark:ring-slate-500'
                : 'border-transparent hover:border-slate-300 dark:hover:border-slate-500',
            ].join(' ')}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {/* 직접 선택 */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="w-5 h-5 rounded border border-slate-300 dark:border-slate-500 shadow-sm shrink-0 disabled:cursor-not-allowed hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-600 transition"
          style={{ backgroundColor: safeValue }}
          title="직접 선택"
        />
        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 select-all">{safeValue}</span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="text-[10px] text-blue-500 dark:text-blue-400 underline hover:text-blue-700 dark:hover:text-blue-300 disabled:cursor-not-allowed transition-colors"
        >
          직접 선택
        </button>
        <input
          ref={inputRef}
          type="color"
          value={safeValue}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className="sr-only"
        />
      </div>
    </div>
  );
}
