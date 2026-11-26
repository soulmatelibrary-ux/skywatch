import { apiClient } from './client';
import type { ApiResponse } from '../../types';

export interface UserSimple {
  id: number;
  name: string;
  team: string;
  role: string;
  is_active: boolean;
}

export interface UserAdmin {
  id: number;
  name: string;
  login_id: string;
  role: string;
  team: string;
  grade: string | null;
  is_active: boolean;
  sort_order: number;
  joined_at: string | null;
  resigned_at: string | null;
  note: string | null;
  no_excel: boolean;
  created_at: string;
}

export interface UserCreateBody {
  name: string;
  login_id: string;
  role: string;
  team: string;
  grade?: string | null;
  password: string;
  sort_order?: number;
  joined_at?: string | null;
  no_excel?: boolean;
  note?: string | null;
}

export interface UserUpdateBody {
  name?: string;
  login_id?: string;
  role?: string;
  team?: string;
  grade?: string | null;
  is_active?: boolean;
  sort_order?: number;
  joined_at?: string | null;
  resigned_at?: string | null;
  note?: string | null;
  no_excel?: boolean;
}

export const usersApi = {
  list: () => apiClient.get<ApiResponse<UserSimple[]>>('/users'),
  adminList: () => apiClient.get<ApiResponse<UserAdmin[]>>('/users/admin'),
  create: (body: UserCreateBody) => apiClient.post<ApiResponse<UserAdmin>>('/users', body),
  update: (id: number, body: UserUpdateBody) => apiClient.put<ApiResponse<UserAdmin>>(`/users/${id}`, body),
  deactivate: (id: number) => apiClient.delete<ApiResponse<null>>(`/users/${id}`),
  resetPassword: (id: number, new_password: string) =>
    apiClient.post<ApiResponse<null>>(`/users/${id}/password`, { new_password }),
};
