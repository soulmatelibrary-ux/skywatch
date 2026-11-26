import { useState } from 'react';
import { workThreadApi } from '../services/api/workThreadApi';
import type { ThreadCreateBody } from '../services/api/workThreadApi';
import { useUIStore } from '../store/uiStore';
import type { WorkThread } from '../types/shiftLog';
import { addDays, kstToday } from '../utils/shiftText';
import { useAsyncData } from './useAsyncData';

/** 과제 보드 — 장기 과제 전체, 이어지는 일(진행·보류 + 최근 7일 완료). */
export function useWorkThreadBoard() {
  const addToast = useUIStore(s => s.addToast);
  const [busy, setBusy] = useState(false);
  const projects = useAsyncData<WorkThread[]>(
    async () => (await workThreadApi.list({ kind: 'project' })).data.data ?? [], [], [],
  );
  const threads = useAsyncData<WorkThread[]>(
    async () => (await workThreadApi.list({ kind: 'thread', closed_since: addDays(kstToday(), -7) })).data.data ?? [], [], [],
  );
  const reload = () => { projects.reload(); threads.reload(); };

  async function createProject(body: ThreadCreateBody): Promise<boolean> {
    setBusy(true);
    try {
      await workThreadApi.create(body);
      addToast('장기 과제를 만들었습니다.', 'success');
      reload();
      return true;
    } catch {
      addToast('장기 과제를 만들지 못했습니다.', 'error');
      return false;
    } finally {
      setBusy(false);
    }
  }

  return { projects: projects.data, threads: threads.data, isLoading: projects.isLoading || threads.isLoading, reload, createProject, busy };
}
