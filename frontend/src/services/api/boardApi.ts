import { apiClient } from './client';
import type { ApiResponse } from '../../types';
import type { BoardCategory } from '../../types/log';

export const boardApi = {
  get: (params?: { team?: string; date_from?: string; date_to?: string }) =>
    apiClient.get<ApiResponse<BoardCategory[]>>('/board', { params }),

  updateCardStatus: (cardId: number, status: string) =>
    apiClient.patch<ApiResponse<null>>(`/cards/${cardId}/status`, { status }),

  deleteCard: (cardId: number) =>
    apiClient.delete<ApiResponse<null>>(`/cards/${cardId}`),
};
