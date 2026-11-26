import { apiClient } from './client';
import type { ApiResponse } from '../../types';
import type { LoginRequest, User } from '../../types/user';

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<ApiResponse<User>>('/auth/login', data),

  logout: () =>
    apiClient.post<ApiResponse<null>>('/auth/logout'),

  me: () =>
    apiClient.get<ApiResponse<User>>('/auth/me'),

  verifyPassword: (password: string) =>
    apiClient.post<ApiResponse<null>>('/auth/verify-password', { password }),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post<ApiResponse<null>>('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),
};
