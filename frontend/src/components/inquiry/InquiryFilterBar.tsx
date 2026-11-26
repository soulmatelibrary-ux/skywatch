import { useEffect, useRef, useState } from 'react';

interface Props {
  year: number | null;
  month: number | null;
  dateFrom: string | null;
  dateTo: string | null;
  category: string | null;
  status: string | null;
  searchQuery: string;
  categories: string[];
  onFilterChange: (filters: {
    year?: number | null;
    month?: number | null;
    date_from?: string | null;
    date_to?: string | null;
    category?: string | null;
    status?: string | null;
    query?: string;
  }) => void;
}

// 로컬 날짜 → 'YYYY-MM-DD' (toISOString 은 UTC 변환으로 하루 밀림)
function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const SEARCH_DEBOUNCE_MS = 300;

const STATUS_OPTIONS = [
  { value: 'completed', label: '완료', color: 'green' },
  { value: 'in_progress', label: '진행중', color: 'blue' },
  { value: 'pr_registered', label: 'PR등록', color: 'purple' },
  { value: 'pr_duplicate', label: 'PR중복', color: 'orange' },
  { value: 'tracking', label: '추적관찰', color: 'yellow' },
];

export function InquiryFilterBar({
  year,
  month,
  dateFrom,
  dateTo,
  category,
  status,
  searchQuery,
  categories,
  onFilterChange,
}: Props) {
  const [useRangeFilter, setUseRangeFilter] = useState(!!dateFrom || !!dateTo);
  const [searchInput, setSearchInput] = useState(searchQuery);
  const lastEmitted = useRef(searchQuery);

  // 외부에서 검색어가 바뀐 경우(전체조회 등)에만 입력창 동기화
  useEffect(() => {
    if (searchQuery !== lastEmitted.current) {
      lastEmitted.current = searchQuery;
      setSearchInput(searchQuery);
    }
  }, [searchQuery]);

  // 입력이 멈춘 뒤에만 조회
  useEffect(() => {
    if (searchInput === lastEmitted.current) return;
    const t = setTimeout(() => {
      lastEmitted.current = searchInput;
      onFilterChange({ query: searchInput });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput, onFilterChange]);

  const handleToggleRange = () => {
    const newUseRangeFilter = !useRangeFilter;
    setUseRangeFilter(newUseRangeFilter);

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    if (newUseRangeFilter) {
      // 기간조회로 전환: 현재 월 범위 설정
      const monthIndex = today.getMonth();
      const firstDay = toYmd(new Date(currentYear, monthIndex, 1));
      const lastDay = toYmd(new Date(currentYear, monthIndex + 1, 0));
      onFilterChange({ date_from: firstDay, date_to: lastDay, year: null, month: null });
    } else {
      // 월조회로 전환: 현재 연도/월로 설정
      onFilterChange({ date_from: null, date_to: null, year: currentYear, month: currentMonth });
    }
  };

  const inputCls = 'rounded-lg border border-slate-300 bg-white px-2 py-1 text-[13px] text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';
  const labelCls = 'shrink-0 text-[12px] text-slate-500 dark:text-slate-400';
  const seg = (on: boolean) => `whitespace-nowrap rounded-md px-2.5 py-0.5 text-[12px] font-medium transition ${on ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 dark:border-slate-700/80 dark:bg-slate-900">
      <div className="relative min-w-[240px] flex-1">
        <svg viewBox="0 0 20 20" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          aria-label="문의사항 검색"
          placeholder="키워드·내용 검색 (A&B 모두, !B 제외)"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className={`w-full pl-8 ${inputCls}`}
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex rounded-lg bg-slate-200/70 p-0.5 dark:bg-slate-800" role="group" aria-label="기간 방식">
          <button type="button" onClick={() => useRangeFilter && handleToggleRange()} className={seg(!useRangeFilter)}>월별</button>
          <button type="button" onClick={() => !useRangeFilter && handleToggleRange()} className={seg(useRangeFilter)}>기간</button>
        </div>
        {!useRangeFilter ? (
          <>
            <input
              type="number"
              aria-label="연도"
              placeholder="연도"
              value={year ?? ''}
              onChange={e => onFilterChange({ year: e.target.value === '' ? null : parseInt(e.target.value, 10) })}
              className={`w-20 ${inputCls}`}
            />
            <select
              aria-label="월"
              value={month ?? ''}
              onChange={e => onFilterChange({ month: e.target.value === '' ? null : parseInt(e.target.value, 10) })}
              className={inputCls}
            >
              <option value="">모든 달</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}월</option>
              ))}
            </select>
          </>
        ) : (
          <>
            <input type="date" aria-label="시작일" value={dateFrom || ''} onChange={e => onFilterChange({ date_from: e.target.value || null })} className={inputCls} />
            <span className="text-slate-400">~</span>
            <input type="date" aria-label="종료일" value={dateTo || ''} onChange={e => onFilterChange({ date_to: e.target.value || null })} className={inputCls} />
          </>
        )}
      </div>

      <label className="flex items-center gap-1.5">
        <span className={labelCls}>카테고리</span>
        <select value={category || ''} onChange={e => onFilterChange({ category: e.target.value || null })} className={inputCls}>
          <option value="">전체</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>

      <label className="flex items-center gap-1.5">
        <span className={labelCls}>상태</span>
        <select value={status || ''} onChange={e => onFilterChange({ status: e.target.value || null })} className={inputCls}>
          <option value="">전체</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </label>
    </div>
  );
}
