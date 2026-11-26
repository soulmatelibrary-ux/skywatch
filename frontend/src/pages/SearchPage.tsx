import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { UnifiedSearchItem } from '../types/search';
import { LogDetailModal } from '../components/logs/LogDetailModal';
import { InquiryDetailPanel } from '../components/inquiry/InquiryDetailPanel';
import { SearchHero } from '../components/search/SearchHero';
import { SearchInput } from '../components/search/SearchInput';
import { SearchFilters } from '../components/search/SearchFilters';
import { SearchPager, SearchResultList } from '../components/search/SearchResultList';
import { SearchSyntaxHelp } from '../components/search/SearchSyntaxHelp';
import { TABS, computeDateRange, type DatePreset, type Tab } from '../components/search/searchMeta';
import { useSearchModal } from '../hooks/useSearchModal';
import { useTabSearch } from '../hooks/useTabSearch';
import { useSearchHistory } from '../hooks/useSearchHistory';
import { useSearchSuggestions } from '../hooks/useSearchSuggestions';

const PAGE_SIZE = 20;

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQ);
  const [inputValue, setInputValue] = useState(initialQ);
  const [syncedQ, setSyncedQ] = useState(initialQ);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [showHelp, setShowHelp] = useState(false);
  const [sortOrder, setSortOrder] = useState<'score' | 'date'>('score');
  const [inputFocused, setInputFocused] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const { results, isLoading, hasSearched, isTruncated, doSearch } = useTabSearch();
  const { viewLogId, viewCardId, viewCommentId, closeLog, viewInquiry, closeInquiry, handleOpen } = useSearchModal();
  const { history, add: addHistory, remove: removeHistory } = useSearchHistory();
  const { suggestions } = useSearchSuggestions(inputValue, inputFocused);
  const { dateFrom, dateTo } = useMemo(
    () => computeDateRange(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo],
  );

  // 주소의 ?q= 가 바뀌면(헤더 검색창 등) 검색어를 맞춘다 — 렌더 중 상태 보정
  if (initialQ !== syncedQ) {
    setSyncedQ(initialQ);
    if (initialQ) { setQuery(initialQ); setInputValue(initialQ); }
  }

  // 탭·검색어·정렬·기간이 바뀌면 1쪽부터
  const pageKey = `${activeTab}|${query}|${sortOrder}|${dateFrom}|${dateTo}`;
  const [pageState, setPageState] = useState({ key: pageKey, page: 1 });
  const page = pageState.key === pageKey ? pageState.page : 1;
  const setPage = (p: number) => setPageState({ key: pageKey, page: p });

  useEffect(() => {
    if (query) doSearch(query, { dateFrom, dateTo });
  }, [query, doSearch, dateFrom, dateTo]);

  useEffect(() => { listRef.current?.scrollTo({ top: 0 }); }, [page, pageKey]);

  const runSearch = (q: string) => {
    const next = q.trim();
    if (!next) return;
    setInputValue(next);
    addHistory(next);
    if (next !== query) setQuery(next);
    else doSearch(next, { dateFrom, dateTo });
  };

  const tabItems: UnifiedSearchItem[] = useMemo(() => {
    const base = results[activeTab];
    if (sortOrder !== 'date') return base;
    return [...base].sort((a, b) => (b.work_date ?? b.updated_at ?? '').localeCompare(a.work_date ?? a.updated_at ?? ''));
  }, [activeTab, results, sortOrder]);

  const counts = useMemo(
    () => Object.fromEntries(TABS.map(t => [t.id, results[t.id].length])) as Record<Tab, number>,
    [results],
  );

  const totalPages = Math.max(1, Math.ceil(tabItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = tabItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const tabLabel = TABS.find(t => t.id === activeTab)?.label ?? '';

  const inputProps = {
    value: inputValue,
    onChange: setInputValue,
    onSubmit: () => runSearch(inputValue),
    loading: isLoading,
    history,
    suggestions,
    onFocusChange: setInputFocused,
    onHistorySelect: runSearch,
    onHistoryRemove: removeHistory,
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {!hasSearched ? (
        <SearchHero {...inputProps} onExample={runSearch} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col bg-[#F3F6F9] px-4 pt-4 sm:px-6 dark:bg-[#0B1524]">
          <div className="mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center gap-3">
              <h1 className="hidden shrink-0 text-[17px] font-bold tracking-[-0.02em] text-slate-900 md:block dark:text-white">통합검색</h1>
              <div className="min-w-0 flex-1"><SearchInput {...inputProps} /></div>
              <button
                type="button"
                aria-expanded={showHelp}
                onClick={() => setShowHelp(v => !v)}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${showHelp ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                검색 방법
              </button>
            </div>
            {showHelp && (
              <div className="mt-3 shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700/80 dark:bg-slate-900">
                <SearchSyntaxHelp />
              </div>
            )}

            <div className="mt-4">
              <SearchFilters
                activeTab={activeTab} onTab={setActiveTab} counts={counts}
                datePreset={datePreset} onDatePreset={setDatePreset}
                customFrom={customFrom} customTo={customTo} onCustomFrom={setCustomFrom} onCustomTo={setCustomTo}
                sortOrder={sortOrder} onSort={setSortOrder}
              />
            </div>

            <p className="mt-3 shrink-0 text-[12px] text-slate-500 dark:text-slate-400" aria-live="polite">
              {isLoading ? '찾는 중…' : (
                <>
                  “{query}” {tabLabel} {isTruncated && activeTab === 'all' ? '상위 ' : ''}
                  <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">{tabItems.length}</span>건
                  {isTruncated && <span className="ml-2 text-amber-700 dark:text-amber-400">결과가 많습니다. 기간을 좁히거나 단어를 더 넣어 보세요.</span>}
                </>
              )}
            </p>

            <div ref={listRef} className={`mt-2 min-h-0 flex-1 overflow-auto pb-2 transition-opacity ${isLoading ? 'opacity-50' : ''}`}>
              {tabItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-6 py-14 text-center dark:border-slate-700">
                  <p className="text-[15px] font-semibold text-slate-700 dark:text-slate-200">{tabLabel}에서 찾은 자료가 없습니다.</p>
                  <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
                    단어를 줄이거나 다른 표현(예: 장비명, 편명)으로 검색해 보세요. 기간을 지정했다면 &lsquo;전체 기간&rsquo;으로 바꿔 보세요.
                  </p>
                </div>
              ) : (
                <SearchResultList items={paged} query={query} startIndex={(currentPage - 1) * PAGE_SIZE} onOpen={handleOpen} />
              )}
            </div>
            <div className="shrink-0">
              <SearchPager page={currentPage} total={totalPages} onPage={setPage} />
            </div>
          </div>
        </div>
      )}

      <LogDetailModal logId={viewLogId} initialCardId={viewCardId} initialCommentId={viewCommentId} onClose={closeLog} />
      {viewInquiry && <InquiryDetailPanel inquiry={viewInquiry} isOpen onClose={closeInquiry} />}
    </div>
  );
}
