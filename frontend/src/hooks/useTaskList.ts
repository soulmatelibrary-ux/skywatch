import { useCallback, useEffect, useState } from 'react';
import { taskApi } from '../services/api/taskApi';
import type { Task, TaskCreate, TaskUpdate } from '../types/task';

const DEFAULT_DAYS = 60;

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getOneMonthAgoToTodayRange(reference = new Date()) {
  const end = new Date(reference);
  const start = new Date(reference);
  start.setMonth(start.getMonth() - 1);
  return {
    from: formatLocalDate(start),
    to: formatLocalDate(end),
  };
}

export function useTaskList(_currentUserId: number) {
  const defaultRange = getOneMonthAgoToTodayRange();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tab, setTab] = useState('all');
  const [status, setStatus] = useState<'active' | 'completed' | 'all'>('active');
  const [dateField, setDateField] = useState<'created' | 'due'>('created');
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);
  const [dueSoonCount, setDueSoonCount] = useState(0);
  const [createdOnly, setCreatedOnly] = useState(false);

  const load = useCallback(async (
    t: string,
    d: number,
    s: 'active' | 'completed' | 'all',
    df: 'created' | 'due',
    from: string,
    to: string,
    co: boolean,
  ) => {
    setIsLoading(true);
    try {
      const apiTab = t === 'all' && co ? 'created' : t;
      const r = await taskApi.list({
        tab: apiTab,
        days: apiTab === 'all' ? d : undefined,
        status: s,
        dateField: df,
        dateFrom: from || null,
        dateTo: to || null,
      });
      setTasks(r.data.data ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshCounts = useCallback(() => {
    taskApi.list({ tab: 'overdue', status: 'active' }).then(r => setOverdueCount(r.data.data?.length ?? 0));
    taskApi.list({ tab: 'due-soon', status: 'active' }).then(r => setDueSoonCount(r.data.data?.length ?? 0));
  }, []);

  useEffect(() => { load(tab, days, status, dateField, dateFrom, dateTo, createdOnly); }, [load, tab, days, status, dateField, dateFrom, dateTo, createdOnly]);
  useEffect(() => { refreshCounts(); }, [refreshCounts]);

  const tabCount = useCallback((t: string): number => {
    if (t === 'overdue') return overdueCount;
    if (t === 'due-soon') return dueSoonCount;
    if (t === 'deadline') return overdueCount + dueSoonCount;
    return 0;
  }, [overdueCount, dueSoonCount]);

  const loadMore = () => setDays(prev => prev + 60);
  const resetDateFilter = () => {
    const nextRange = getOneMonthAgoToTodayRange();
    setDateField('created');
    setDateFrom(nextRange.from);
    setDateTo(nextRange.to);
  };

  const createTask = async (data: TaskCreate): Promise<Task> => {
    const r = await taskApi.create(data);
    const t = r.data.data!;
    setTasks(prev => [t, ...prev]);
    setSelectedId(t.id);
    refreshCounts();
    return t;
  };

  const updateTask = async (id: number, data: TaskUpdate): Promise<Task> => {
    const r = await taskApi.update(id, data);
    const t = r.data.data!;
    setTasks(prev => prev.map(x => x.id === id ? t : x));
    refreshCounts();
    return t;
  };

  const completeTask = async (id: number): Promise<Task> => {
    const r = await taskApi.complete(id);
    const t = r.data.data!;
    setTasks(prev => prev.map(x => x.id === id ? t : x));
    refreshCounts();
    return t;
  };

  const removeTask = async (id: number): Promise<void> => {
    await taskApi.remove(id);
    setTasks(prev => prev.filter(x => x.id !== id));
    if (selectedId === id) setSelectedId(null);
    refreshCounts();
  };

  return {
    filtered: tasks,
    tab, setTab, days, loadMore,
    selectedId, setSelectedId,
    selectedTask: tasks.find(t => t.id === selectedId) ?? null,
    isLoading, tabCount, load: () => load(tab, days, status, dateField, dateFrom, dateTo, createdOnly),
    status, setStatus,
    dateField, setDateField, dateFrom, setDateFrom, dateTo, setDateTo, resetDateFilter,
    createdOnly, setCreatedOnly,
    createTask, updateTask, completeTask, removeTask,
  };
}
