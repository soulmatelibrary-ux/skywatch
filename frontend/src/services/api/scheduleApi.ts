import { apiClient } from './client';
import type { ApiResponse } from '../../types';
import type { LeaveRequest, Schedule, ShiftOverride } from '../../types/schedule';

export interface HomeAdjustment {
  user_ids: number[];
  leave_ids: number[];
  temp_names: string[];
}

export interface ShiftWorker {
  shift: '주간' | '야간' | '일근';
  code: string;
  user_id: number;
  name: string;
  is_changed: boolean;
}

export const scheduleApi = {
  getSchedules: (year: number, month: number) =>
    apiClient.get<ApiResponse<Schedule[]>>(`/schedules?year=${year}&month=${month}`),

  getLeaveRequests: (year: number, month: number) =>
    apiClient.get<ApiResponse<LeaveRequest[]>>(`/schedules/leaves?year=${year}&month=${month}`),

  getOverrides: (year: number, month: number) =>
    apiClient.get<ApiResponse<ShiftOverride[]>>(`/schedules/overrides?year=${year}&month=${month}`),

  getHomeWorkers: (date: string) =>
    apiClient.get<ApiResponse<Record<string, HomeAdjustment | null>>>(`/schedules/home-workers?date=${date}`),

  saveHomeWorkers: (body: { date: string; shift_type: string } & HomeAdjustment) =>
    apiClient.post<ApiResponse<HomeAdjustment>>('/schedules/home-workers', body),

  getShiftWorkers: (date: string) =>
    apiClient.get<ApiResponse<ShiftWorker[]>>(`/schedules/shift-workers?date=${date}`),

  generateRotation: (base_date: string, weeks: number) =>
    apiClient.post<ApiResponse<{ weeks: number; rows: number }>>('/schedules/generate-rotation', { base_date, weeks }),
};
