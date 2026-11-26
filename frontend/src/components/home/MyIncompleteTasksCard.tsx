import type { Task } from '../../types/task';
import { fmtDue, isOverdue, IMPORTANCE } from '../../utils/taskUtils';

interface Props { tasks: Task[]; }

export function MyIncompleteTasksCard({ tasks }: Props) {
  const overdue = tasks.filter(isOverdue);

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <h3 className="text-[15px] font-semibold text-slate-700 dark:text-slate-100 mb-3 flex items-center gap-2 leading-none">
        <CheckIcon />
        내 미완료 Task
        <span
          className={`ml-auto text-[12px] font-bold px-2 py-0.5 rounded-full ${
            overdue.length > 0
              ? 'bg-red-100 text-red-600'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
          }`}
        >
          {tasks.length}건
        </span>
      </h3>

      <div className="space-y-1 max-h-[190px] overflow-y-auto pr-1">
        {tasks.length === 0 ? (
          <div className="text-center py-4 text-slate-300 text-[13px]">미완료 Task 없음</div>
        ) : (
          tasks.map(t => (
            <div
              key={t.id}
              className={`px-3 py-2 rounded-lg border text-[13px] ${
                isOverdue(t)
                  ? 'border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-900/20'
                  : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 min-h-[28px]">
                <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${IMPORTANCE[t.importance]?.cls ?? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                  {IMPORTANCE[t.importance]?.label ?? t.importance}
                </span>
                <div className="font-medium text-slate-800 dark:text-slate-100 flex-1 truncate leading-tight">{t.title}</div>
                {t.due_date && (
                  <span className={`shrink-0 text-[11px] whitespace-nowrap ${isOverdue(t) ? 'text-red-500 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                    {isOverdue(t) ? '기한초과 ' : '마감 '} {fmtDue(t.due_date)}
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

function CheckIcon() {
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
      className="text-blue-500"
    >
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}
