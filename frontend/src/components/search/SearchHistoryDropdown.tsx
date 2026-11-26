// 검색창 아래 최근 검색어 · 추천 검색어 목록
import type { SearchSuggestionItem } from '../../services/api/searchApi';

interface Props {
  items: string[];
  suggestions: SearchSuggestionItem[];
  onSelect: (q: string) => void;
  onRemove: (q: string) => void;
}

const ROW = 'flex cursor-pointer items-center gap-3 px-4 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800';

export function SearchHistoryDropdown({ items, suggestions, onSelect, onRemove }: Props) {
  // 기록에 이미 있는 검색어는 추천에서 제외
  const historySet = new Set(items.map(h => h.toLowerCase()));
  const filtered = suggestions.filter(s => !historySet.has(s.query_text.toLowerCase()));
  if (!items.length && !filtered.length) return null;

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left shadow-xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/40">
      {items.length > 0 && <div className="px-4 pb-1 pt-1.5 text-[11px] text-slate-400 dark:text-slate-500">최근 검색</div>}
      {items.map(q => (
        <div key={`h-${q}`} className={`group ${ROW}`} onMouseDown={e => { e.preventDefault(); onSelect(q); }}>
          <span className="flex-1 truncate">{q}</span>
          <button
            type="button"
            aria-label={`${q} 기록 삭제`}
            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onRemove(q); }}
            className="shrink-0 rounded px-1.5 text-[11px] text-slate-400 opacity-0 hover:text-slate-700 focus:opacity-100 group-hover:opacity-100 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>
      ))}
      {filtered.length > 0 && (
        <>
          <div className="mt-1 border-t border-slate-100 px-4 pb-1 pt-2 text-[11px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
            다른 사람들이 많이 찾은 검색어
          </div>
          {filtered.map(s => (
            <div key={`s-${s.query_text}`} className={ROW} onMouseDown={e => { e.preventDefault(); onSelect(s.query_text); }}>
              <span className="flex-1 truncate">{s.query_text}</span>
              <span className="shrink-0 text-[11px] tabular-nums text-slate-400">{s.search_count}회</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
