import { apiClient } from './client';
import type { ApiResponse } from '../../types';
import type { Task, TaskCreate, TaskUpdate, RecurringTemplate, RecurringTemplateCreate } from '../../types/task';

export const taskApi = {
  list: (params?: {
    tab?: string;
    days?: number;
    status?: 'active' | 'completed' | 'all';
    dateField?: 'created' | 'due';
    dateFrom?: string | null;
    dateTo?: string | null;
  }) =>
    apiClient.get<ApiResponse<Task[]>>('/tasks', {
      params: {
        tab: params?.tab,
        days: params?.days,
        status: params?.status,
        date_field: params?.dateField,
        date_from: params?.dateFrom ?? undefined,
        date_to: params?.dateTo ?? undefined,
      },
    }),

  get: (id: number) =>
    apiClient.get<ApiResponse<Task>>(`/tasks/${id}`),

  create: (data: TaskCreate) =>
    apiClient.post<ApiResponse<Task>>('/tasks', data),

  update: (id: number, data: TaskUpdate) =>
    apiClient.put<ApiResponse<Task>>(`/tasks/${id}`, data),

  complete: (id: number) =>
    apiClient.post<ApiResponse<Task>>(`/tasks/${id}/complete`),

  remove: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/tasks/${id}`),

  templates: {
    list: () =>
      apiClient.get<ApiResponse<RecurringTemplate[]>>('/tasks/templates'),

    create: (data: RecurringTemplateCreate) =>
      apiClient.post<ApiResponse<RecurringTemplate>>('/tasks/templates', data),

    update: (id: number, data: Partial<RecurringTemplateCreate>) =>
      apiClient.put<ApiResponse<RecurringTemplate>>(`/tasks/templates/${id}`, data),

    toggle: (id: number) =>
      apiClient.post<ApiResponse<RecurringTemplate>>(`/tasks/templates/${id}/toggle`),

    remove: (id: number) =>
      apiClient.delete<ApiResponse<null>>(`/tasks/templates/${id}`),

    match: (date: string, shiftType: string) =>
      apiClient.get<ApiResponse<RecurringTemplate[]>>('/tasks/templates/match', {
        params: { date, shift_type: shiftType },
      }),
  },
};
