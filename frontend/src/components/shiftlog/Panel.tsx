import type { ReactNode } from 'react';
import type { Phase } from '../../types/shiftLog';
import { V2_PANEL, V2_PANEL_HEAD, V2_SEG_ON } from '../common/v2Styles';

export function Panel({ title, extra, children, className = '' }: { title: ReactNode; extra?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#1e293b] ${V2_PANEL} ${className}`}>
      <div className={`flex items-center gap-2 border-b border-slate-200 px-4 py-2.5 text-[14px] font-bold text-slate-800 dark:border-slate-700 dark:text-slate-100 ${V2_PANEL_HEAD}`}>
        {title}<span className="flex-1" />{extra}
      </div>
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-4 py-5 text-center text-[13px] text-slate-400">{children}</div>;
}

const month = (m: string) => Number(m.slice(5));

/** 장기 과제 단계 — 지난 단계는 초록, 현재 단계는 파랑. */
export function PhaseSteps({ phases, current }: { phases: Phase[]; current: number }) {
  if (!phases.length) return null;
  return (
    <div className="mt-1.5 flex gap-1">
      {phases.map((p, i) => (
        <span key={`${p.name}-${i}`} className={`flex flex-1 flex-col rounded px-1 py-0.5 text-center text-[11px] leading-tight ${
          i < current ? 'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300'
            : i === current ? `bg-blue-600 font-bold text-white ${V2_SEG_ON}` : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
          <b>{p.name}</b>
          <small className="opacity-80">{month(p.start_month)}{p.end_month !== p.start_month ? `~${month(p.end_month)}` : ''}월</small>
        </span>
      ))}
    </div>
  );
}
