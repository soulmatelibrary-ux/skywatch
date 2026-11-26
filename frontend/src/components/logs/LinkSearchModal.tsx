import { useEffect } from 'react';
import { useLinkSearch } from '../../hooks/useLinkSearch';
import type { CardLinkResult } from '../../types/log';

interface Props {
  onSelect: (item: CardLinkResult) => void;
  onClose: () => void;
  targetCardLabel?: string;
  excludeCardId?: number | null;
}

export function LinkSearchModal({ onSelect, onClose, targetCardLabel, excludeCardId }: Props) {
  const { query, setQuery, results, isLoading } = useLinkSearch();
  const visibleResults = excludeCardId ? results.filter(item => item.card_id !== excludeCardId) : results;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg dark:bg-slate-900 dark:border dark:border-slate-700">
        {targetCardLabel && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-[12px] text-blue-600 flex items-center gap-1.5 dark:bg-cyan-500/10 dark:border-cyan-400/20 dark:text-cyan-200">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            <span className="font-medium truncate">{targetCardLabel}</span>
            <span className="text-blue-400 shrink-0 dark:text-cyan-100">선택</span>
          </div>
        )}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 dark:border-slate-700">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500 shrink-0 dark:text-cyan-200"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="카드 제목 또는 일지 제목 검색..."
            className="flex-1 text-[14px] outline-none bg-transparent text-slate-900 dark:text-slate-100"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto dark:bg-slate-900">
          {isLoading && <div className="py-6 text-center text-[13px] text-slate-400 dark:text-slate-500">검색 중...</div>}
          {!isLoading && query && visibleResults.length === 0 && <div className="py-6 text-center text-[13px] text-slate-400 dark:text-slate-500">검색 결과가 없습니다</div>}
          {!isLoading && !query && <div className="py-6 text-center text-[13px] text-slate-400 dark:text-slate-500"># 입력 후 검색하세요</div>}
          {visibleResults.map(item => (
            <button
              key={item.card_id}
              onClick={() => { onSelect(item); onClose(); }}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-100 last:border-0 transition dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <div className="text-[14px] font-medium text-slate-800 truncate dark:text-slate-100">{item.card_title}</div>
              <div className="text-[12px] text-slate-500 mt-0.5 truncate dark:text-slate-400">
                [{item.log_date}] {item.log_title ?? '제목 없음'} · {item.log_author}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
