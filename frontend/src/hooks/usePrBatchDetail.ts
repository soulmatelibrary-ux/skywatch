import { useState, useCallback } from 'react';
import { prBatchApi } from '../services/api/prBatchApi';
import type { PrBatch } from '../types/prBatch';

export function usePrBatchDetail() {
  const [batch, setBatch] = useState<PrBatch | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async (id: number) => {
    setIsLoading(true);
    try {
      const res = await prBatchApi.get(id);
      setBatch(res.data.data ?? null);
    } catch {
      setBatch(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reload = useCallback(() => {
    if (batch?.id) load(batch.id);
  }, [batch, load]);

  const clear = useCallback(() => setBatch(null), []);

  return { batch, isLoading, load, reload, clear, setBatch };
}
