import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { taskApi } from '../../services/api/taskApi';
import { usersApi } from '../../services/api/usersApi';
import { useAuthStore } from '../../store/authStore';
import type { Task } from '../../types/task';
import type { UserSimple } from '../../services/api/usersApi';
import { TaskDetail } from '../tasks/TaskDetail';
import { XIcon } from '../icons';

interface Props {
  taskId: number | null;
  onClose: () => void;
}

export function TaskQuickViewModal({ taskId, onClose }: Props) {
  const { currentUser } = useAuthStore();
  const [task, setTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<UserSimple[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      setError('');
      return;
    }

    let alive = true;
    setIsLoading(true);
    setError('');
    setTask(null);

    Promise.all([taskApi.get(taskId), usersApi.list()])
      .then(([taskRes, usersRes]) => {
        if (!alive) return;
        setTask(taskRes.data.data ?? null);
        setUsers(usersRes.data.data ?? []);
      })
      .catch(() => {
        if (!alive) return;
        setError('업무 정보를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (alive) setIsLoading(false);
      });

    return () => { alive = false; };
  }, [taskId]);

  if (!taskId) return null;

  return createPortal(
    <div className="fixed inset-0 z-[380] bg-black/50 flex items-center justify-center px-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white dark:bg-[#1e293b] dark:border-slate-700 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-[#1e293b] z-10">
          <span className="text-[14px] font-semibold text-slate-700 dark:text-slate-200">업무 상세</span>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
            <XIcon size={18} />
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 text-slate-400 dark:text-slate-500 text-[14px]">
            불러오는 중...
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-[14px] text-slate-500 dark:text-slate-400">{error}</p>
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-[13px] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              닫기
            </button>
          </div>
        )}

        {!isLoading && !error && task && (
          <TaskDetail
            task={task}
            users={users}
            currentUserId={currentUser?.id ?? 0}
            isAdmin={currentUser?.role === 'admin'}
            onDelete={async () => { onClose(); }}
          />
        )}
      </div>
    </div>,
    document.body
  );
}
