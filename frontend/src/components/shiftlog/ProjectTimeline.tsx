import type { WorkThread } from '../../types/shiftLog';
import { kstToday } from '../../utils/shiftText';
import { ThreadStatusChip } from './ShiftBadges';

function monthRange(projects: WorkThread[]): string[] {
  const now = kstToday().slice(0, 7);
  const all = projects.flatMap(p => p.phases.flatMap(ph => [ph.start_month, ph.end_month])).concat(now);
  let [y, m] = all.reduce((a, b) => (a < b ? a : b)).split('-').map(Number);
  const last = all.reduce((a, b) => (a > b ? a : b));
  const out: string[] = [];
  while (out.length < 24) {
    const cur = `${y}-${String(m).padStart(2, '0')}`;
    out.push(cur);
    if (cur >= last) break;
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

/** 장기 과제 월별 단계 일정 — 지난 단계 초록, 현재 단계 파랑. 이번 달은 옅게 강조. */
export function ProjectTimeline({ projects, onOpen }: { projects: WorkThread[]; onOpen: (id: number) => void }) {
  if (!projects.length) return <div className="px-4 py-6 text-center text-[13px] text-slate-400">장기 과제가 없습니다.</div>;
  const months = monthRange(projects);
  const now = kstToday().slice(0, 7);
  const cols = { gridTemplateColumns: `240px repeat(${months.length}, minmax(48px, 1fr))` };
  return (
    <div className="overflow-x-auto px-4 py-2">
      <div className="grid min-w-[720px] text-[12px]" style={cols}>
        <div className="border-b border-slate-100 py-2 font-bold text-slate-500 dark:border-slate-700">과제</div>
        {months.map(m => <div key={m} className={`border-b border-slate-100 py-2 text-center font-bold text-slate-500 dark:border-slate-700 ${m === now ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>{m.slice(2, 4)}.{Number(m.slice(5))}월</div>)}
        {projects.map(p => (
          <div key={p.id} className="contents">
            <button type="button" onClick={() => onOpen(p.id)} className="border-b border-slate-100 py-2 pr-2 text-left hover:text-blue-600 dark:border-slate-700">
              <b className="text-[13px] text-slate-800 dark:text-slate-100">{p.title}</b> <ThreadStatusChip status={p.status} />
              <div className="text-slate-400">기록 {p.card_count}건 · 기록한 사람 {p.author_count}명{p.recur_month ? ` · 매년 ${p.recur_month}월` : ''}</div>
            </button>
            {months.map(m => {
              const i = p.phases.findIndex(ph => m >= ph.start_month && m <= ph.end_month);
              const ph = p.phases[i];
              const tone = i < 0 ? '' : i < p.current_phase ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                : i === p.current_phase ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800';
              return (
                <div key={m} className={`flex items-center border-b border-slate-100 py-2 dark:border-slate-700 ${m === now ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                  {i >= 0 && <div className={`flex h-[22px] w-full items-center whitespace-nowrap rounded px-1.5 font-bold ${tone}`}>{m === ph.start_month ? ph.name : ''}</div>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
