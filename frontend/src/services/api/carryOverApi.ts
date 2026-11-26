import { apiClient } from './client';
import type { ApiResponse } from '../../types';

export interface CarryOverRow {
  user_id: number;
  user_name: string;
  team: string;
  hours: number;
}

export const carryOverApi = {
  get: (year: number) =>
    apiClient.get<ApiResponse<CarryOverRow[]>>(`/carry-over/${year}`),
  save: (year: number, data: { user_id: number; hours: number }[]) =>
    apiClient.put<ApiResponse<null>>(`/carry-over/${year}`, data),
};
