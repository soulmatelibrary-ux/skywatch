import { apiClient } from './client';
import type { ApiResponse } from '../../types';
import type {
  ExploreQuery, ExploreResult, MemoInput, MissingShift, ShiftCard, ShiftCardInput, ShiftCardUpdateInput,
  ShiftHistoryItem, ShiftType, ShiftView, Worker,
} from '../../types/shiftLog';

export const shiftLogApi = {
  view: (date: string, shift_type: ShiftType) =>
    apiClient.get<ApiResponse<ShiftView>>('/shift-logs/view', { params: { date, shift_type } }),

  missing: (days = 7) =>
    apiClient.get<ApiResponse<MissingShift[]>>('/shift-logs/missing', { params: { days } }),

  history: (days: number, mine: boolean, date_to?: string) =>
    apiClient.get<ApiResponse<ShiftHistoryItem[]>>('/shift-logs/history', { params: { days, mine, date_to } }),

  inbox: (date: string, shift_type: ShiftType) =>
    apiClient.get<ApiResponse<ShiftCard[]>>('/shift-logs/inbox', { params: { date, shift_type } }),

  explore: (q: ExploreQuery) =>
    apiClient.get<ApiResponse<ExploreResult>>('/shift-logs/explore', {
      params: {
        q: q.q || undefined,
        category_ids: q.category_ids?.length ? q.category_ids.join(',') : undefined,
        kinds: q.kinds?.length ? q.kinds.join(',') : undefined,
        worker_id: q.worker_id || undefined,
        date_from: q.date_from || undefined,
        date_to: q.date_to || undefined,
        late_only: q.late_only || undefined,
        page: q.page,
        per_page: q.per_page,
      },
    }),

  addCard: (body: ShiftCardInput) =>
    apiClient.post<ApiResponse<ShiftCard>>('/shift-logs/cards', body),

  updateCard: (id: number, body: ShiftCardUpdateInput) =>
    apiClient.patch<ApiResponse<ShiftCard>>(`/shift-logs/cards/${id}`, body),

  deleteCard: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/shift-logs/cards/${id}`),

  addMemo: (body: MemoInput) =>
    apiClient.post<ApiResponse<ShiftCard>>('/shift-logs/memos', body),

  checkMemo: (cardId: number) =>
    apiClient.post<ApiResponse<null>>(`/shift-logs/memos/${cardId}/check`),

  setParticipants: (date: string, shift_type: ShiftType, user_ids: number[]) =>
    apiClient.put<ApiResponse<Worker[]>>('/shift-logs/participants', { date, shift_type, user_ids }),
};
