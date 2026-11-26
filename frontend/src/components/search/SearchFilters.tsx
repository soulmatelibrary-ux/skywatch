// 결과 화면 — 자료 탭 · 기간 · 정렬
import { DATE_PRESETS, TABS, type DatePreset, type Tab } from './searchMeta';

interface Props {
  activeTab: Tab;
  onTab: (t: Tab) => void;
  counts: Record<Tab, number>;
  datePreset: DatePreset;
  onDatePreset: (p: DatePreset) => void;
  customFrom: string;
  customTo: string;
  onCustomFrom: (v: string) => void;
  onCustomTo: (v: string) => void;
  sortOrder: 'score' | 'date';
  onSort: (s: 'score' | 'date') => void;
}

const SEG = 'whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400';
const SEG_ON = 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white';
const SEG_OFF = 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200';
const DATE_INPUT = 'rounded-md border border-slate-300 bg-white px-2 py-0.5 text-[12px] text-slate-700 outline-none focus:border-sky-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200';

export function SearchFilters(p: Props) {
  return (
    <div className="shrink-0">
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-700/80">
        {TABS.map(({ id, label }) => {
          const on = p.activeTab === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={on}
              type="button"
              onClick={() => p.onTab(id)}
              className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-[14px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400 ${on ? 'border-sky-600 font-semibold text-slate-900 dark:border-sky-400 dark:text-white' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
            >
              {label}
              <span className={`tabular-nums text-[12px] ${on ? 'text-sky-700 dark:text-sky-300' : 'text-slate-400 dark:text-slate-500'}`}>{p.counts[id]}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex rounded-lg bg-slate-200/60 p-0.5 dark:bg-slate-800">
          {DATE_PRESETS.map(d => (
            <button key={d.id} type="button" onClick={() => p.onDatePreset(d.id)} className={`${SEG} ${p.datePreset === d.id ? SEG_ON : SEG_OFF}`}>
              {d.label}
            </button>
          ))}
        </div>
        {p.datePreset === 'custom' && (
          <div className="flex items-center gap-1.5">
            <input type="date" aria-label="시작일" value={p.customFrom} onChange={e => p.onCustomFrom(e.target.value)} className={DATE_INPUT} />
            <span className="text-[12px] text-slate-400">~</span>
            <input type="date" aria-label="종료일" value={p.customTo} onChange={e => p.onCustomTo(e.target.value)} className={DATE_INPUT} />
          </div>
        )}
        <div className="ml-auto flex rounded-lg bg-slate-200/60 p-0.5 dark:bg-slate-800">
          <button type="button" onClick={() => p.onSort('score')} className={`${SEG} ${p.sortOrder === 'score' ? SEG_ON : SEG_OFF}`}>관련도순</button>
          <button type="button" onClick={() => p.onSort('date')} className={`${SEG} ${p.sortOrder === 'date' ? SEG_ON : SEG_OFF}`}>최신순</button>
        </div>
      </div>
    </div>
  );
}
