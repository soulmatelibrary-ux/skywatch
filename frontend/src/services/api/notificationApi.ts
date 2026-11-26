import { apiClient } from './client';
import type { ApiResponse } from '../../types';
import type { Notification } from '../../types/notification';

export const notificationApi = {
  list: (params?: { unreadOnly?: boolean; page?: number; perPage?: number; q?: string; dateFrom?: string; dateTo?: string }) =>
    apiClient.get<ApiResponse<Notification[]>>('/notifications', {
      params: {
        unread_only: params?.unreadOnly ?? false,
        page: params?.page ?? 1,
        per_page: params?.perPage ?? 20,
        q: params?.q ?? '',
        ...(params?.dateFrom ? { date_from: params.dateFrom } : {}),
        ...(params?.dateTo ? { date_to: params.dateTo } : {}),
      },
    }),

  markRead: (id: number) =>
    apiClient.post<ApiResponse<null>>(`/notifications/${id}/read`),

  markAllRead: () =>
    apiClient.post<ApiResponse<null>>('/notifications/read-all'),

  deleteOne: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/notifications/${id}`),

  deleteRead: () =>
    apiClient.delete<ApiResponse<number>>('/notifications/read'),
};
