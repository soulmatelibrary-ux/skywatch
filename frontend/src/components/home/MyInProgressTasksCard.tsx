import type { Task } from '../../types/task';
import { fmtDue, isOverdue, IMPORTANCE } from '../../utils/taskUtils';

interface Props { tasks: Task[]; }

export function MyInProgressTasksCard({ tasks }: Props) {
  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <h3 className="text-[15px] font-semibold text-slate-700 dark:text-slate-100 mb-3 flex items-center gap-2 leading-none">
        <TagIcon />
        진행중인 Task
        <span className="ml-auto text-[12px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
          {tasks.length}건
        </span>
      </h3>

      <div className="space-y-1 max-h-[190px] overflow-y-auto pr-1">
        {tasks.length === 0 ? (
          <div className="text-center py-4 text-slate-300 text-[13px]">진행중인 Task 없음</div>
        ) : (
          tasks.map(t => (
            <div
              key={t.id}
              className="px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 text-[13px]"
            >
              <div className="flex items-center gap-2 min-h-[28px]">
                <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${IMPORTANCE[t.importance]?.cls ?? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                  {IMPORTANCE[t.importance]?.label ?? t.importance}
                </span>
                <div className="font-medium text-slate-800 dark:text-slate-100 flex-1 truncate leading-tight">{t.title}</div>
                <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-200 text-amber-700 whitespace-nowrap">
                  진행
                </span>
                {t.due_date && (
                  <span className={`shrink-0 text-[11px] whitespace-nowrap ${isOverdue(t) ? 'text-red-500 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                    {fmtDue(t.due_date)}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TagIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-amber-500"
    >
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}
