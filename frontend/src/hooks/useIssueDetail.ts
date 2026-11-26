import { useCallback, useEffect, useState } from 'react';
import { issueApi } from '../services/api/issueApi';
import type { Issue } from '../types/issue';

export function useIssueDetail(id: number | null) {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) { setIssue(null); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await issueApi.get(id);
      setIssue(res.data.data ?? null);
    } catch {
      setError('장애 정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { issue, loading, error, refresh: fetch };
}
