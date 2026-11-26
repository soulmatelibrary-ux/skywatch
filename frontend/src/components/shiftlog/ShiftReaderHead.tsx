import type { CSSProperties } from 'react';
import type { ShiftType, ShiftView } from '../../types/shiftLog';
import { dayLabel } from '../../utils/shiftText';
import { V2_NOTICE, V2_OUTLINE, V2_SHIFT_BAND } from '../common/v2Styles';
import { ShiftChip } from './ShiftBadges';

type At = { date: string; shift: ShiftType };

/** 일지 보기의 이전/다음 근무 이동과 "직전 근무를 대신 보여 주는 중" 안내 */
export interface ReadNav {
  prev: At;
  next: At;
  canNext: boolean;
  onStep: (dir: 1 | -1) => void;
  autoFrom: At | null;
  onGoNow: () => void;
}

interface Props {
  view: ShiftView;
  nav: ReadNav;
  onWrite: () => void;
  onOpenLegacy: (logId: number) => void;
}

const ROLE_LABEL: Record<string, string> = { sub: '대체', overtime: '추가 근무' };
const STEP = `rounded-lg border border-slate-200 px-2 py-1 text-[12px] font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 ${V2_OUTLINE}`;
const BTN = 'rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-bold dark:border-slate-600 dark:text-slate-200';
const label = (a: At) => `${dayLabel(a.date)} ${a.shift}`;

/** 근무 하나의 일지 머리 — 날짜·근무·조, 이동·열기 버튼, 근무자·작성자·카드 수 */
export function ShiftReaderHead({ view, nav, onWrite, onOpenLegacy }: Props) {
  const cards = view.cards.filter(c => c.kind !== 'memo');
  const memoCount = view.cards.length - cards.length;
  const authors = [...new Map(view.cards.map(c => [c.author_id, c])).values()];
  const late = view.cards.filter(c => c.is_late);
  const { prev, next, autoFrom } = nav;
  return (
    <>
      <div style={{ '--band': V2_SHIFT_BAND[view.shift_type] ?? 'transparent' } as CSSProperties}
        className="border-b border-slate-200 px-5 py-4 dark:border-slate-700 v2:rounded-tl-[11px] v2:border-[var(--v2-line-soft)] v2:shadow-[inset_4px_0_0_var(--band)]">
        <div className="flex flex-wrap items-center gap-2 text-[18px] font-extrabold text-slate-800 dark:text-slate-100">
          <button type="button" className={STEP} onClick={() => nav.onStep(-1)} title={`${label(prev)} 일지로`} aria-label="이전 근무">‹ 이전 근무</button>
          {dayLabel(view.date)} <ShiftChip shift={view.shift_type} /> {view.team && `${view.team}조`}
          <button type="button" className={STEP} disabled={!nav.canNext} onClick={() => nav.onStep(1)} aria-label="다음 근무"
            title={nav.canNext ? `${label(next)} 일지로` : '다음 근무는 아직 시작하지 않았습니다'}>다음 근무 ›</button>
          <span className="flex-1" />
          {view.log_id && <button type="button" onClick={() => onOpenLegacy(view.log_id!)} className={`${BTN} ${V2_OUTLINE}`}>기존 화면으로 열기</button>}
          <button type="button" onClick={onWrite} className={`${BTN} ${V2_OUTLINE}`}>✍️ 이 근무에 카드 추가</button>
        </div>
        <div className="mt-2.5 grid grid-cols-[64px_1fr] gap-x-2.5 gap-y-1 text-[13px] text-slate-700 dark:text-slate-200">
          <span className="text-[12px] font-bold text-slate-500">근무자</span>
          <span>{view.workers.map(w => w.name + (ROLE_LABEL[w.role] ? `(${ROLE_LABEL[w.role]})` : '')).join(', ') || '근무표 없음'}</span>
          <span className="text-[12px] font-bold text-slate-500">작성자</span>
          <span>{authors.map(c => c.author_name + (c.is_proxy ? ' (대리 작성)' : '')).join(', ') || '-'}</span>
          {late.length > 0 && <><span className="text-[12px] font-bold text-slate-500">작성 시각</span><span className="text-amber-700 dark:text-amber-300">지연 작성 카드 {late.length}장</span></>}
          <span className="text-[12px] font-bold text-slate-500">카드</span>
          <span>{cards.length}장{memoCount ? ` · 전달·메모 ${memoCount}건` : ''}</span>
        </div>
      </div>
      {autoFrom && (
        <div role="status" className={`mx-5 mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[13px] text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100 ${V2_NOTICE} v2:border-y-0 v2:border-r-0 v2:border-[var(--v2-accent)] v2:bg-[var(--v2-accent-soft)] v2:text-[var(--v2-text)]`}>
          <span>ⓘ 지금 근무({label(autoFrom)})는 아직 일지가 없어 직전 근무를 보여 줍니다.</span>
          <button type="button" onClick={nav.onGoNow} className={`rounded-md border border-sky-300 px-2 py-0.5 text-[12px] font-semibold dark:border-sky-700 ${V2_OUTLINE}`}>지금 근무 보기</button>
        </div>
      )}
    </>
  );
}
