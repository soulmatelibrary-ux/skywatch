import type { ReactNode } from 'react';
import { V2_GHOST_BTN, V2_NOTICE } from '../common/v2Styles';

const TONE = {
  amber: 'border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-500 dark:bg-amber-900/30 dark:text-amber-100 v2:border-amber-500',
  red: 'border-red-400 bg-red-50 text-red-800 dark:border-red-500 dark:bg-red-900/30 dark:text-red-100 v2:border-red-500',
  info: 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-500 dark:bg-slate-800/60 dark:text-slate-200 v2:border-[var(--v2-line)]',
};

/** 수정 상자 안 띠 — 확인·충돌·오류 안내. 단추는 actions 로 */
export function Band({ tone, children, actions }: { tone: keyof typeof TONE; children: ReactNode; actions?: ReactNode }) {
  return (
    <div role={tone === 'info' ? undefined : 'alert'} className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border-l-4 px-3 py-2 text-[12.5px] leading-5 ${TONE[tone]} ${V2_NOTICE}`}>
      <span className="min-w-0 flex-1">{children}</span>
      {actions && <span className="flex shrink-0 flex-wrap gap-1.5">{actions}</span>}
    </div>
  );
}

export const BTN = `min-h-[32px] rounded-md border border-slate-300 bg-white px-3 text-[12px] font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-500 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 ${V2_GHOST_BTN}`;
export const BTN_DANGER = 'min-h-[32px] rounded-md bg-red-600 px-3 text-[12px] font-bold text-white hover:bg-red-700 disabled:opacity-50';
