import { apiClient } from './client';
import type { ApiResponse } from '../../types';

export interface NoticeItem {
  id: number;
  text: string;
  start_date: string;
  end_date: string;
}

export interface TickerItem {
  key: string;
  text: string;
  type: 'notice' | 'leave' | 'memo';
}

export const noticesApi = {
  ticker: () => apiClient.get<TickerItem[]>('/notices/ticker'),
  list: () => apiClient.get<ApiResponse<NoticeItem[]>>('/notices'),
  create: (body: { text: string; start_date: string; end_date: string }) =>
    apiClient.post<ApiResponse<NoticeItem>>('/notices', body),
  remove: (id: number) => apiClient.delete<ApiResponse<null>>(`/notices/${id}`),
};
