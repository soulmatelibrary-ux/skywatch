// DB 백업 및 복구 API 호출.

import { apiClient } from './client';
import type { ApiResponse } from '../../types';

export interface BackupItem {
  filename: string;
  size_bytes: number;
  size_mb: number;
  created_at: string;
}

export interface BackupLogItem {
  id: number;
  action: 'backup' | 'restore';
  status: 'success' | 'failure';
  filename: string | null;
  file_size_bytes: number | null;
  error_message: string | null;
  performed_by: string | null;
  created_at: string;
  is_deleted?: boolean;
}

export interface BackupInfo {
  backup_scope: string;
  description: string;
}

export const backupApi = {
  getInfo: () =>
    apiClient.get<ApiResponse<BackupInfo>>('/backup/info'),

  list: () =>
    apiClient.get<ApiResponse<BackupItem[]>>('/backup'),

  listLogs: () =>
    apiClient.get<ApiResponse<BackupLogItem[]>>('/backup/logs'),

  create: (target: 'skywatch' | 'skynet' = 'skywatch') =>
    apiClient.post<ApiResponse<{ filename: string; message: string }>>(`/backup?target=${target}`),

  download: (filename: string) => {
    const a = document.createElement('a');
    a.href = `/backup/${encodeURIComponent(filename)}/download`;
    a.download = filename;
    a.click();
  },

  restore: (filename: string) =>
    apiClient.post<ApiResponse<{ message: string }>>(`/backup/${encodeURIComponent(filename)}/restore`),

  delete: (filename: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/backup/${encodeURIComponent(filename)}`),

  deleteLog: (logId: number) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/backup/logs/${logId}`),

  restoreLog: (logId: number) =>
    apiClient.post<ApiResponse<{ message: string }>>(`/backup/logs/${logId}/restore`),
};
