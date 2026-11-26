import { useCallback, useEffect, useMemo, useState } from 'react';
import { taskApi } from '../services/api/taskApi';
import { logApi } from '../services/api/logApi';
import type { Task } from '../types/task';
import type { Log } from '../types/log';
import { parseDueDate } from '../utils/taskDate';

export function useHomePage(currentUserId: number) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [unreadLogs, setUnreadLogs] = useState<Log[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!currentUserId) return;
    setIsLoading(true);
    try {
      const [taskRes, logRes] = await Promise.all([
        taskApi.list({ tab: 'all', status: 'all' }),
        logApi.list({ per_page: 200 }),
      ]);
      setTasks(taskRes.data.data ?? []);
      setUnreadLogs((logRes.data.data ?? []).filter(l => !l.is_read));
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => { load(); }, [load]);

  const sortByDueDate = (a: Task, b: Task) => {
    const ad = parseDueDate(a.due_date)?.getTime() ?? Number.POSITIVE_INFINITY;
    const bd = parseDueDate(b.due_date)?.getTime() ?? Number.POSITIVE_INFINITY;
    return ad - bd;
  };

  const myTodoTasks = useMemo(() =>
    tasks
      .filter(t => t.recipients.includes(currentUserId) && !t.completed_by.includes(currentUserId))
      .sort(sortByDueDate),
    [tasks, currentUserId],
  );

  const myInProgressTasks = useMemo(() =>
    tasks
      .filter(t => t.sender_id === currentUserId)
      .filter(t => t.recipients.some(uid => !t.completed_by.includes(uid)))
      .sort(sortByDueDate),
    [tasks, currentUserId],
  );

  return { myTodoTasks, myInProgressTasks, unreadLogs, isLoading, reload: load };
}
