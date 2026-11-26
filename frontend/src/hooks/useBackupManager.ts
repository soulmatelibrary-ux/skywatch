// DB 백업 목록, 생성, 복구, 삭제 상태 관리.

import { useCallback, useEffect, useState } from 'react';
import { backupApi, type BackupItem } from '../services/api/backupApi';

/** enabled=false 면 목록을 불러오지 않는다 (관리자가 아닐 때). */
export function useBackupManager(enabled = true) {
  const [items, setItems] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<false | 'skywatch' | 'skynet'>(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await backupApi.list();
      setItems(res.data.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '목록 조회 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) load();
  }, [load, enabled]);

  const create = useCallback(async (target: 'skywatch' | 'skynet' = 'skywatch') => {
    setCreating(target);
    setError(null);
    try {
      await backupApi.create(target);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '백업 생성 실패');
    } finally {
      setCreating(false);
    }
  }, [load]);

  const restore = useCallback(async (filename: string) => {
    setRestoring(filename);
    setError(null);
    try {
      await backupApi.restore(filename);
      if (filename.startsWith('skywatch_')) {
        window.location.reload();
        return;
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '복구 실패');
    } finally {
      setRestoring(null);
    }
  }, [load]);

  const remove = useCallback(async (filename: string) => {
    setError(null);
    try {
      await backupApi.delete(filename);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제 실패');
    }
  }, [load]);

  return { items, loading, creating, restoring, error, load, create, restore, remove };
}
