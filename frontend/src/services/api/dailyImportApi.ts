import { apiClient } from './client';
import type { CsvImportResult } from '../../types/csvImport';

/** 업무일지 가져오기 — logs: daily_*.csv, attachments: attachfiledaily_*.csv (관리자 전용) */
export type DailyImportKind = 'logs' | 'attachments';

export const dailyImportApi = {
  upload: (kind: DailyImportKind, file: File, dryRun: boolean) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post<{ data: CsvImportResult }>(`/admin/daily-import/${kind}`, fd, { params: { dry_run: dryRun } });
  },
};
