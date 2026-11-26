import { useState } from 'react';
import { workThreadApi } from '../services/api/workThreadApi';
import { useUIStore } from '../store/uiStore';
import type { ThreadCandidate } from '../types/shiftLog';
import { useAsyncData } from './useAsyncData';

const ACTION_LABEL = { project: '장기 과제', thread: '이어지는 일', skip: '제외' } as const;

/** 과제 묶기 — 기존 카드의 반복 제목 후보 조회와 적용. */
export function useThreadCandidates() {
  const addToast = useUIStore(s => s.addToast);
  const [busyNorm, setBusyNorm] = useState<string | null>(null);
  const res = useAsyncData<ThreadCandidate[]>(async () => (await workThreadApi.candidates()).data.data ?? [], [], []);

  async function apply(norm: string, action: keyof typeof ACTION_LABEL) {
    setBusyNorm(norm);
    try {
      const r = await workThreadApi.applyCandidate(norm, action);
      addToast(action === 'skip' ? '후보에서 제외했습니다.' : `${ACTION_LABEL[action]} ${r.data.data ?? 0}건으로 묶었습니다.`, 'success');
      res.setData(list => list.filter(c => c.norm !== norm));
    } catch {
      addToast('적용하지 못했습니다.', 'error');
    } finally {
      setBusyNorm(null);
    }
  }

  return { items: res.data, isLoading: res.isLoading, apply, busyNorm };
}
