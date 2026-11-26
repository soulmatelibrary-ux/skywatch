// 백업 대상 테이블 정보 로드.

import { useEffect, useState } from 'react';
import { backupApi, type BackupInfo } from '../services/api/backupApi';

export function useBackupInfo() {
  const [info, setInfo] = useState<BackupInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInfo = async () => {
      try {
        const res = await backupApi.getInfo();
        setInfo(res.data.data || null);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : '백업 정보 로드 실패');
        setInfo(null);
      }
    };
    loadInfo();
  }, []);

  return { info, error };
}
