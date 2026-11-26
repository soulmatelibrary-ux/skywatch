import { apiClient } from './client';
import type { ApiResponse } from '../../types';
import type { Phase, ThreadCandidate, ThreadStatus, WorkThread, WorkThreadDetail } from '../../types/shiftLog';

export interface ThreadListParams {
  kind?: 'thread' | 'project';
  status?: ThreadStatus[];
  as_of?: string;
  closed_since?: string;
}

export interface ThreadCreateBody {
  kind: 'thread' | 'project';
  title: string;
  category_id: number | null;
  started_on?: string;
  recur_month: number | null;
  phases: Phase[];
}

export const workThreadApi = {
  list: (p: ThreadListParams) =>
    apiClient.get<ApiResponse<WorkThread[]>>('/work-threads', {
      params: { kind: p.kind, status: p.status?.join(','), as_of: p.as_of, closed_since: p.closed_since },
    }),

  get: (id: number) => apiClient.get<ApiResponse<WorkThreadDetail>>(`/work-threads/${id}`),

  create: (body: ThreadCreateBody) => apiClient.post<ApiResponse<WorkThreadDetail>>('/work-threads', body),

  update: (id: number, body: { title?: string; status?: ThreadStatus; current_phase?: number }) =>
    apiClient.patch<ApiResponse<WorkThreadDetail>>(`/work-threads/${id}`, body),

  // 이미 완료된 카드를 골라 묶는다. thread_id 가 없으면 title 로 새 묶음(종료 상태)을 만든다.
  linkCards: (body: { card_ids: number[]; thread_id?: number; title?: string }) =>
    apiClient.post<ApiResponse<WorkThreadDetail>>('/work-threads/link-cards', body),

  unlinkCard: (threadId: number, cardId: number) =>
    apiClient.delete<ApiResponse<WorkThreadDetail>>(`/work-threads/${threadId}/cards/${cardId}`),

  copyNextYear: (id: number) => apiClient.post<ApiResponse<WorkThreadDetail>>(`/work-threads/${id}/copy`),

  candidates: () => apiClient.get<ApiResponse<ThreadCandidate[]>>('/work-threads/candidates'),

  applyCandidate: (norm: string, action: 'project' | 'thread' | 'skip') =>
    apiClient.post<ApiResponse<number>>('/work-threads/candidates/apply', { norm, action }),
};
