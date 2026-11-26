import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ShiftHistoryItem } from '../../types/shiftLog';
import { currentShift, dayLabel } from '../../utils/shiftText';
import { V2_INPUT, V2_PANEL, V2_SHIFT_BAND } from '../common/v2Styles';
import { ShiftChip } from './ShiftBadges';

interface Props {
  items: ShiftHistoryItem[];
  selected: { date: string; shift: string };
  mine: boolean;
  canMore: boolean;
  isLoading?: boolean;
  onMine: (v: boolean) => void;
  onPick: (date: string, shift: string) => void;
  /** 날짜 칸으로 이동 (지금 근무 날짜까지만) */
  onPickDate: (date: string) => void;
  onMore: () => void;
}

const TAG = 'rounded px-1.5 text-[11px] font-bold';
const INPUT = `min-w-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[12px] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 ${V2_INPUT}`;
const EMPTY = 'px-4 py-6 text-center text-[13px] text-slate-400';

/** 거를 문장 — 근무자·조(A조, A·B조 주야 근무는 A조·B조 모두)·근무 종류·날짜 */
const haystack = (i: ShiftHistoryItem) => [
  i.worker_names.join(' '), ...i.team.split('·').filter(Boolean).map(t => `${t}조`), i.team ? `${i.team}조` : '',
  i.shift_type, i.date, dayLabel(i.date),
].join(' ').toLowerCase();

export function ShiftHistoryList({ items, selected, mine, canMore, isLoading, onMine, onPick, onPickDate, onMore }: Props) {
  const [q, setQ] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const word = q.trim();
  const words = word.toLowerCase().split(/\s+/).filter(Boolean);
  // 불러온 근무 안에서 거른다 (더 오래된 날은 날짜 칸으로 이동). 여러 단어는 모두 들어가야 한다.
  const shown = words.length ? items.filter(i => { const h = haystack(i); return words.every(w => h.includes(w)); }) : items;
  // 다음·이전 근무로 넘겨도 선택한 줄이 목록 안에 보이게 한다
  useEffect(() => {
    listRef.current?.querySelector('[data-on="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [selected.date, selected.shift, items.length]);
  return (
    <div className={`rounded-xl border border-slate-200 bg-white @min-[640px]:sticky @min-[640px]:top-0 dark:border-slate-700 dark:bg-[#1e293b] ${V2_PANEL}`}>
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-2.5 text-[14px] font-bold dark:border-slate-700 dark:text-slate-100 v2:border-[var(--v2-line-soft)]">
        근무 목록 <span className="text-[12px] font-semibold text-slate-400">최근 순</span><span className="flex-1" />
        <label className="flex items-center gap-1 text-[12px] font-semibold text-slate-500">
          <input type="checkbox" checked={mine} onChange={e => onMine(e.target.checked)} /> 내 근무만
        </label>
      </div>
      <div className="flex items-center gap-1.5 border-b border-slate-200 px-4 py-2 dark:border-slate-700 v2:border-[var(--v2-line-soft)]">
        <input type="date" value={selected.date} max={currentShift().date} title="날짜로 이동" aria-label="날짜로 이동"
          onChange={e => { const v = e.target.value; if (v && v <= currentShift().date) onPickDate(v); }} className={`${INPUT} w-[132px] shrink-0`} />
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="근무자·조·날짜" aria-label="근무 목록 거르기"
          className={`${INPUT} flex-1`} />
      </div>
      <div ref={listRef} className="max-h-[240px] overflow-auto @min-[640px]:max-h-[calc(100vh-260px)]">
        {shown.map(i => {
          const on = i.date === selected.date && i.shift_type === selected.shift;
          return (
            <button key={`${i.date}-${i.shift_type}`} type="button" data-on={on} onClick={() => onPick(i.date, i.shift_type)}
              style={{ '--band': V2_SHIFT_BAND[i.shift_type] ?? 'transparent' } as CSSProperties}
              className={`flex w-full items-center gap-2 border-b border-slate-100 px-4 py-2 text-left text-[13px] dark:border-slate-700/60 v2:border-[var(--v2-line-soft)] ${on
                ? 'bg-blue-50 dark:bg-blue-900/30 v2:bg-[var(--v2-sel)] v2:shadow-[inset_3px_0_0_var(--band)]'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800 v2:hover:bg-[var(--v2-hover)]'}`}>
              <ShiftChip shift={i.shift_type} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1">
                  <b className="text-slate-800 dark:text-slate-100">{dayLabel(i.date)}</b>
                  {i.team && <span className="text-[12px] text-slate-400">{i.team}조</span>}
                  {i.missing && <span className={`${TAG} bg-red-50 text-red-600 dark:bg-red-900/40`}>미작성</span>}
                  {i.has_late && <span className={`${TAG} bg-amber-50 text-amber-700 dark:bg-amber-900/40`}>지연</span>}
                  {i.has_proxy && <span className={`${TAG} bg-amber-50 text-amber-700 dark:bg-amber-900/40`}>대리</span>}
                </div>
                <div className="truncate text-[12px] text-slate-500">{i.worker_names.join('·')}</div>
              </div>
              <span className="shrink-0 whitespace-nowrap text-[12px] text-slate-400">{i.card_count}장{i.memo_count ? ` · 전달 ${i.memo_count}` : ''}</span>
            </button>
          );
        })}
        {items.length === 0 && <div className={EMPTY}>{isLoading ? '근무 목록을 불러오는 중...' : '근무가 없습니다.'}</div>}
        {items.length > 0 && shown.length === 0 && (
          <div className={EMPTY}>"{word}"에 맞는 근무가 없습니다.{canMore && ' 아래에서 이전 근무를 더 불러오거나 날짜 칸으로 이동하세요.'}</div>
        )}
        {canMore && (
          <button type="button" onClick={onMore} className="w-full py-2.5 text-[12px] font-bold text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800">이전 14일 더 보기</button>
        )}
      </div>
    </div>
  );
}
