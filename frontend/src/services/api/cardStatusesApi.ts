import { apiClient } from './client';
import type { ApiResponse } from '../../types';
import type { CardStatusItem } from '../../types/log';

export const cardStatusesApi = {
  list: () => apiClient.get<ApiResponse<CardStatusItem[]>>('/card-statuses'),
  create: (body: { key: string; label: string; color?: string | null; sort_order?: number }) =>
    apiClient.post<ApiResponse<CardStatusItem>>('/card-statuses', body),
  update: (id: number, body: { label?: string; color?: string | null; sort_order?: number; is_active?: boolean }) =>
    apiClient.put<ApiResponse<CardStatusItem>>(`/card-statuses/${id}`, body),
  remove: (id: number) => apiClient.delete<ApiResponse<null>>(`/card-statuses/${id}`),
};
