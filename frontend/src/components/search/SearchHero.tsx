// 통합검색 첫 화면 — 레이더 거리환(range ring)을 배경으로 한 검색창
import type { ComponentProps } from 'react';
import { SearchInput } from './SearchInput';
import { SearchSyntaxHelp } from './SearchSyntaxHelp';

const EXAMPLES = ['FDP COLD', '한일 AIDC fail', '데이터블럭 CA 경고', 'o1app 서버 전환'];

type Props = ComponentProps<typeof SearchInput> & { onExample: (q: string) => void };

function RadarRings() {
  return (
    <svg
      viewBox="-500 -500 1000 1000"
      className="pointer-events-none absolute left-1/2 top-1/2 h-[1100px] w-[1100px] -translate-x-1/2 -translate-y-1/2 text-sky-900/[0.07] dark:text-sky-300/[0.08]"
      aria-hidden
    >
      {[90, 180, 270, 360, 450].map(r => (
        <circle key={r} r={r} fill="none" stroke="currentColor" strokeWidth={r === 270 ? 2 : 1} />
      ))}
      <path d="M-500 0H500M0 -500V500" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8" />
      <g className="origin-center motion-safe:animate-[spin_12s_linear_infinite]">
        <path d="M0 0 L0 -450 A450 450 0 0 1 225 -390 Z" className="fill-sky-500/[0.07] dark:fill-sky-400/[0.08]" />
      </g>
    </svg>
  );
}

export function SearchHero({ onExample, ...inputProps }: Props) {
  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[#F3F6F9] px-4 py-10 dark:bg-[#0B1524]">
      <RadarRings />
      <div className="relative z-10 w-full max-w-2xl">
        <h1 className="text-center text-[30px] font-bold tracking-[-0.03em] text-slate-900 dark:text-white">통합검색</h1>
        <p className="mb-7 mt-1 text-center text-[14px] text-slate-500 dark:text-slate-400">
          업무일지, PR, 문의사항, 관제시스템 문서를 한 번에 찾습니다.
        </p>
        <SearchInput {...inputProps} large />
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[12px]">
          <span className="text-slate-400 dark:text-slate-500">이렇게 찾아보세요</span>
          {EXAMPLES.map(q => (
            <button
              key={q}
              type="button"
              onClick={() => onExample(q)}
              className="rounded-full border border-slate-300 bg-white/70 px-3 py-1 text-slate-600 transition hover:border-sky-500 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-sky-400 dark:hover:text-sky-300"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="mx-auto mt-8 max-w-xl">
          <SearchSyntaxHelp />
        </div>
      </div>
    </div>
  );
}
