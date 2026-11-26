// 검색어 입력 + 최근/추천 검색어 + 검색 버튼 (첫 화면과 결과 화면 공용)
import { useState } from 'react';
import type { SearchSuggestionItem } from '../../services/api/searchApi';
import { SearchHistoryDropdown } from './SearchHistoryDropdown';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  history: string[];
  suggestions: SearchSuggestionItem[];
  onFocusChange: (focused: boolean) => void;
  onHistorySelect: (q: string) => void;
  onHistoryRemove: (q: string) => void;
  large?: boolean;
}

export function SearchInput({
  value, onChange, onSubmit, loading, history, suggestions,
  onFocusChange, onHistorySelect, onHistoryRemove, large = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const setFocus = (v: boolean) => { setOpen(v); onFocusChange(v); };

  return (
    <div className="relative">
      <div
        className={[
          'flex items-center gap-2 border bg-white transition focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-500/15',
          'border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:focus-within:border-sky-400',
          large ? 'rounded-2xl py-2 pl-5 pr-2 shadow-lg shadow-slate-900/5 dark:shadow-black/30' : 'rounded-xl py-1 pl-4 pr-1',
        ].join(' ')}
      >
        <svg viewBox="0 0 20 20" className={`shrink-0 text-slate-400 ${large ? 'h-5 w-5' : 'h-4 w-4'}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 150)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); setOpen(false); onSubmit(); }
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="장비명, 편명, 증상 등으로 검색 (예: 한일 AIDC fail)"
          aria-label="통합검색어"
          autoFocus={large}
          className={`min-w-0 flex-1 bg-transparent text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 ${large ? 'py-1.5 text-[17px]' : 'py-1.5 text-[14px]'}`}
        />
        <button
          type="button"
          onClick={() => { setOpen(false); onSubmit(); }}
          disabled={loading}
          className={`shrink-0 bg-sky-600 font-semibold text-white transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 disabled:opacity-60 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400 dark:focus-visible:ring-offset-slate-900 ${large ? 'rounded-xl px-6 py-2.5 text-[15px]' : 'rounded-lg px-4 py-1.5 text-[13px]'}`}
        >
          {loading ? '찾는 중…' : '검색'}
        </button>
      </div>
      {open && (
        <SearchHistoryDropdown
          items={history}
          suggestions={suggestions}
          onSelect={q => { setOpen(false); onHistorySelect(q); }}
          onRemove={onHistoryRemove}
        />
      )}
    </div>
  );
}
