import { useState } from 'react';
import type { SearchParams } from '../../hooks/useTechDocList';

interface Props {
  onSearch: (params: SearchParams) => void;
}

const INPUT = 'rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[13px] text-slate-800 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';
const SEG = 'whitespace-nowrap rounded-md px-2 py-0.5 text-[12px] font-medium transition';

export function TechDocSearchBar({ onSearch }: Props) {
  const [q, setQ] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [semantic, setSemantic] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const active = !!(q || dateFrom || dateTo || semantic);

  const submit = (e: React.FormEvent) => { e.preventDefault(); onSearch({ q: q.trim(), dateFrom, dateTo, semantic }); };
  const reset = () => { setQ(''); setDateFrom(''); setDateTo(''); setSemantic(false); onSearch({}); };
  const setMode = (next: boolean) => { setSemantic(next); onSearch({ q: q.trim(), dateFrom, dateTo, semantic: next }); };

  return (
    <form onSubmit={submit} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => !semantic && setShowHint(true)}
          onBlur={() => setTimeout(() => setShowHint(false), 150)}
          placeholder={semantic ? '문장으로 검색 (예: 장애 처리 절차)' : '제목·본문·첨부 내용 검색'}
          aria-label="문서 검색어"
          className={`${INPUT} w-full`}
        />
        {showHint && !semantic && (
          <div className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-600 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <p><b>AIDC 업무</b> 두 단어 모두 · <b>AIDC OR FDT</b> 하나 이상 · <b>-야간 업무</b> 야간 제외</p>
          </div>
        )}
      </div>
      <div className="flex rounded-lg bg-slate-200/70 p-0.5 dark:bg-slate-800" role="group" aria-label="검색 방식">
        <button type="button" onClick={() => setMode(false)} className={`${SEG} ${!semantic ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>단어</button>
        <button type="button" onClick={() => setMode(true)} className={`${SEG} ${semantic ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`} title="뜻이 비슷한 문서까지 찾습니다">의미</button>
      </div>
      <div className="flex items-center gap-1">
        <input type="date" aria-label="시작일" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={`${INPUT} w-[8.5rem]`} />
        <span className="text-[12px] text-slate-400">~</span>
        <input type="date" aria-label="종료일" value={dateTo} onChange={e => setDateTo(e.target.value)} className={`${INPUT} w-[8.5rem]`} />
      </div>
      <button type="submit" className="rounded-lg bg-sky-600 px-3 py-1 text-[13px] font-semibold text-white hover:bg-sky-700 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400">검색</button>
      {active && (
        <button type="button" onClick={reset} className="text-[12px] text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200">
          조건 지우기
        </button>
      )}
    </form>
  );
}
