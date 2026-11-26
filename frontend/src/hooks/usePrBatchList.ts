import { useState, useCallback, useEffect } from 'react';
import { prBatchApi } from '../services/api/prBatchApi';
import type { PrBatchListItem } from '../types/prBatch';

export function usePrBatchList() {
  const [items, setItems] = useState<PrBatchListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [year, setYear] = useState<number | undefined>(undefined);
  const [query, setQuery] = useState('');
  const [skip, setSkip] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const LIMIT = 50;

  const load = useCallback(async (s: string, y: number | undefined, sk: number, q: string) => {
    setIsLoading(true);
    try {
      const res = await prBatchApi.list({
        status: s || undefined,
        year: y,
        skip: sk,
        limit: LIMIT,
        query: q.trim() || undefined,
      });
      setItems(res.data.data?.items ?? []);
      setTotal(res.data.data?.total ?? 0);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(status, year, skip, query), 250);
    return () => window.clearTimeout(timer);
  }, [load, status, year, skip, query]);

  const filterStatus = useCallback((s: string) => { setStatus(s); setSkip(0); }, []);
  const filterYear = useCallback((y: number | undefined) => { setYear(y); setSkip(0); }, []);
  const filterQuery = useCallback((q: string) => { setQuery(q); setSkip(0); }, []);
  const refresh = useCallback(() => load(status, year, skip, query), [load, status, year, skip, query]);

  return {
    items, total, skip, setSkip, limit: LIMIT,
    status, year, query, filterStatus, filterYear, filterQuery,
    refresh, isLoading,
  };
}
