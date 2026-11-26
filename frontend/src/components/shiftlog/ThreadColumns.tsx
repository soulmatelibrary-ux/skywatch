import type { WorkThread } from '../../types/shiftLog';
import { currentShift, kstToday, stepShift } from '../../utils/shiftText';
import { ThreadStatusChip } from './ShiftBadges';

const COLUMNS: [WorkThread['status'], string][] = [['open', '진행중'], ['hold', '보류'], ['done', '최근 7일 완료']];

/** 현재 근무부터 거꾸로 10개 근무 (오래된 → 최근 순) */
function recentShiftKeys(): string[] {
  const keys: string[] = [];
  let cur = currentShift();
  while (keys.length < 10) {
    keys.unshift(`${cur.date} ${cur.shift}`);
    cur = stepShift(cur.date, cur.shift, -1);
  }
  return keys;
}

function days(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
}

/** 이어지는 일 칸 — 막대는 최근 10개 근무 중 기록이 있었던 근무. */
export function ThreadColumns({ threads, onOpen }: { threads: WorkThread[]; onOpen: (id: number) => void }) {
  const recent = recentShiftKeys();
  const today = kstToday();
  return (
    <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-3">
      {COLUMNS.map(([st, label]) => {
        const items = threads.filter(t => t.status === st);
        return (
          <div key={st} className="min-h-[160px] rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mx-1 mb-2.5 flex items-center gap-2 text-[14px]"><ThreadStatusChip status={st} /><span className="text-[12px] text-slate-400">{label} {items.length}건</span></h3>
            {items.map(t => {
              const on = new Set(t.recent_shifts);
              return (
                <button key={t.id} type="button" onClick={() => onOpen(t.id)}
                  className="mb-1.5 flex w-full items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-left transition hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-[#1e293b]">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: t.category_color ?? '#94a3b8' }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold leading-tight text-slate-900 dark:text-slate-50">{t.title}</span>
                    <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span>{t.owner_name ?? '-'}</span><span>·</span><span>{t.card_count}건</span><span>·</span>
                      <span>{st === 'done' && t.closed_on ? `${days(t.started_on, t.closed_on)}일` : `${days(t.started_on, today)}일째`}</span>
                      {st !== 'done' && t.last_card?.next_step && (
                        <><span>·</span><span className="max-w-[120px] truncate font-bold text-amber-700 dark:text-amber-400">{t.last_card.next_step}</span></>
                      )}
                    </span>
                  </span>
                  <span className="flex shrink-0 gap-px" title="최근 10개 근무 중 기록이 있었던 근무">
                    {recent.map(k => <i key={k} className={`h-2 w-2 rounded-sm ${on.has(k) ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />)}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
