import { useCallback, useEffect, useState } from 'react';
import { issueApi } from '../services/api/issueApi';
import type { IssueListItem, IssueListParams } from '../types/issue';

export function useIssueList(params: IssueListParams = {}) {
  const [items, setItems] = useState<IssueListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await issueApi.list(params);
      setItems(res.data.data?.items ?? []);
      setTotal(res.data.data?.total ?? 0);
    } catch {
      setError('목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { items, total, loading, error, refresh: fetch };
}
