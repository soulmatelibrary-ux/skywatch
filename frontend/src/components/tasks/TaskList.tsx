import type { Task } from '../../types/task';
import type { UserSimple } from '../../services/api/usersApi';
import { formatDueDateDisplay, isDueOverdue } from '../../utils/taskDate';

const IMP_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  normal: 'bg-amber-100 text-amber-700',
  low: 'bg-green-100 text-green-700',
};

const IMP_LABEL: Record<string, string> = {
  high: '긴급',
  normal: '보통',
  low: '낮음',
};

interface Props {
  tasks: Task[];
  selectedId: number | null;
  users: UserSimple[];
  currentUserId: number;
  onSelect: (id: number) => void;
  showDeadlineBadge?: boolean;
}

export function TaskList({ tasks, selectedId, users, currentUserId, onSelect, showDeadlineBadge }: Props) {
  const getUser = (id: number) => users.find(u => u.id === id);
  const rate = (t: Task) => t.recipients.length === 0 ? 0 : Math.round(t.completed_by.length / t.recipients.length * 100);
  const fmtDue = (d: string | null) => formatDueDateDisplay(d);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-300">
        <div className="text-5xl mb-3">📄</div>
        <p className="text-[14px]">해당 조건의 업무가 없습니다</p>
      </div>
    );
  }

  return (
    <div>
      {tasks.map(task => {
        const overdue = isDueOverdue(task.due_date);
        return (
          <div
            key={task.id}
            onClick={() => onSelect(task.id)}
            className={`px-4 py-3.5 border-b border-slate-100 dark:border-slate-700 cursor-pointer transition border-l-4 ${
              selectedId === task.id ? 'bg-blue-50 dark:bg-slate-700 border-l-blue-600' : 'border-l-transparent hover:bg-white dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-start gap-2 mb-2">
              <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${IMP_BADGE[task.importance]}`}>
                {IMP_LABEL[task.importance]}
              </span>
              {showDeadlineBadge && task.due_date && (
                <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 ${overdue ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                  {overdue ? '지연' : '마감임박'}
                </span>
              )}
              <p className="flex-1 text-[14px] font-semibold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">{task.title}</p>
              {task.recipients.includes(currentUserId) && (
                <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 mt-0.5">담당</span>
              )}
              {task.sender_id === currentUserId && (
                <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 mt-0.5">등록</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[12px] text-slate-400 dark:text-slate-500">
              <span>{getUser(task.sender_id)?.name ?? '?'}</span>
              <span>·</span>
              <span className={overdue ? 'text-red-500 font-semibold' : ''}>
                {overdue ? '지연 ' : '마감 '}{fmtDue(task.due_date)}
              </span>
              <span className="ml-auto flex items-center gap-1">
                <span className="inline-block h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 w-14 overflow-hidden">
                  <span
                    className={`block h-full rounded-full transition-all ${rate(task) === 100 ? 'bg-green-500' : overdue ? 'bg-red-400' : 'bg-blue-500'}`}
                    style={{ width: `${rate(task)}%` }}
                  />
                </span>
                <span className={`text-[11px] ${rate(task) === 100 ? 'text-green-600 font-semibold' : ''}`}>
                  {task.completed_by.length}/{task.recipients.length}
                </span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
