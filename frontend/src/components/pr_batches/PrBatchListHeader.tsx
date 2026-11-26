const YEARS = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i);

interface Props {
  total: number;
  query: string;
  year?: number;
  onQueryChange: (value: string) => void;
  onYearChange: (year?: number) => void;
  onCreate: () => void;
}

export function PrBatchListHeader({ total, query, year, onQueryChange, onYearChange, onCreate }: Props) {
  const field = 'rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[12px] text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';

  return <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 space-y-2 shrink-0">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-slate-500 dark:text-slate-400">버전 <b className="text-slate-700 dark:text-slate-200">{total}</b>건</span>
      <button onClick={onCreate} className="text-[12px] px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg">+ 신규 버전</button>
    </div>
    <div className="flex flex-wrap gap-2">
      <select value={year ?? ''} onChange={e => onYearChange(e.target.value ? Number(e.target.value) : undefined)} className={field} aria-label="연도">
        <option value="">전체 연도</option>
        {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
      </select>
      <input value={query} onChange={e => onQueryChange(e.target.value)} placeholder="버전 검색"
        className={`${field} min-w-32 flex-1`} />
    </div>
  </div>;
}
