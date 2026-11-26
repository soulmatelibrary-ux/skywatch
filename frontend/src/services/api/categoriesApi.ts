import { apiClient } from './client';
import type { ApiResponse } from '../../types';
import type { CardCategory } from '../../types/log';

export const categoriesApi = {
  list: () => apiClient.get<ApiResponse<CardCategory[]>>('/categories'),
  create: (body: { name: string; color?: string | null; sort_order?: number }) =>
    apiClient.post<ApiResponse<CardCategory>>('/categories', body),
  update: (id: number, body: { name?: string; color?: string | null; sort_order?: number; is_active?: boolean }) =>
    apiClient.put<ApiResponse<CardCategory>>(`/categories/${id}`, body),
  remove: (id: number) => apiClient.delete<ApiResponse<null>>(`/categories/${id}`),
};
