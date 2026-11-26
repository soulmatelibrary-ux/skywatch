import { workThreadApi } from '../services/api/workThreadApi';
import type { WorkThread } from '../types/shiftLog';
import { useAsyncData } from './useAsyncData';

/** 종료된 이어지는 일 전체 — "종료된 일 찾기"를 열 때만 불러온다 (장기 과제는 제외, 거기엔 자체 단계가 있다). */
export function useClosedThreads() {
  return useAsyncData<WorkThread[]>(
    async () => (await workThreadApi.list({ kind: 'thread', status: ['done'] })).data.data ?? [], [], [],
  );
}
