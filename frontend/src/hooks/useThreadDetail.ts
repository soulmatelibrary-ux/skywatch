import { useState } from 'react';
import { workThreadApi } from '../services/api/workThreadApi';
import { useUIStore } from '../store/uiStore';
import type { ThreadStatus, WorkThreadDetail } from '../types/shiftLog';
import { useAsyncData } from './useAsyncData';

/** 과제 상세 — 조회, 상태·단계 변경, 다음 해 복사. 변경 후 onChanged 호출. */
export function useThreadDetail(threadId: number | null, onChanged?: () => void) {
  const addToast = useUIStore(s => s.addToast);
  const [busy, setBusy] = useState(false);
  const { data, setData, isLoading } = useAsyncData<WorkThreadDetail | null>(
    async () => (threadId ? (await workThreadApi.get(threadId)).data.data ?? null : null), [threadId], null,
  );

  async function patch(body: { status?: ThreadStatus; current_phase?: number }, msg: string) {
    if (!threadId) return;
    setBusy(true);
    try {
      const res = await workThreadApi.update(threadId, body);
      setData(res.data.data ?? null);
      addToast(msg, 'success');
      onChanged?.();
    } catch {
      addToast('과제를 변경하지 못했습니다.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function copyNextYear() {
    if (!threadId) return;
    setBusy(true);
    try {
      const res = await workThreadApi.copyNextYear(threadId);
      addToast(`'${res.data.data?.title}' 과제를 만들었습니다.`, 'success');
      onChanged?.();
    } catch {
      addToast('복사하지 못했습니다.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function unlinkCard(cardId: number) {
    if (!threadId) return;
    setBusy(true);
    try {
      const res = await workThreadApi.unlinkCard(threadId, cardId);
      setData(res.data.data ?? null);
      addToast('묶음에서 뺐습니다.', 'success');
      onChanged?.();
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      addToast(typeof detail === 'string' ? detail : '묶음에서 빼지 못했습니다.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return {
    thread: data, isLoading, busy, copyNextYear, unlinkCard,
    setStatus: (status: ThreadStatus) => patch({ status }, status === 'done' ? '종료했습니다.' : '상태를 바꿨습니다.'),
    nextPhase: () => data && patch({ current_phase: data.current_phase + 1 }, '다음 단계로 넘겼습니다.'),
  };
}
