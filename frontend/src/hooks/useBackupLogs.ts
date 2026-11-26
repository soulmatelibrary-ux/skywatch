// DB 백업 실행 이력 조회 상태 관리.

import { useCallback, useEffect, useState } from 'react';
import { backupApi, type BackupLogItem } from '../services/api/backupApi';

export function useBackupLogs() {
  const [logs, setLogs] = useState<BackupLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await backupApi.listLogs();
      setLogs(res.data.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '이력 조회 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteLog = useCallback(
    async (logId: number) => {
      setDeleting(logId);
      setError(null);
      try {
        await backupApi.deleteLog(logId);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : '이력 삭제 실패');
      } finally {
        setDeleting(null);
      }
    },
    [load]
  );

  const restoreLog = useCallback(
    async (logId: number) => {
      setDeleting(logId);
      setError(null);
      try {
        await backupApi.restoreLog(logId);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : '이력 복구 실패');
      } finally {
        setDeleting(null);
      }
    },
    [load]
  );

  useEffect(() => {
    load();
  }, [load]);

  return { logs, loading, error, deleting, load, deleteLog, restoreLog };
}
