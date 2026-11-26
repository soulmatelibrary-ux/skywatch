import { useCallback, useEffect, useState } from 'react';
import { cardStatusesApi } from '../services/api/cardStatusesApi';
import type { CardStatusItem } from '../types/log';

export function useCardStatusManager() {
  const [items, setItems] = useState<CardStatusItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await cardStatusesApi.list();
      setItems(res.data.data ?? []);
    } catch { setError('불러오기 실패'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (body: { key: string; label: string; color?: string | null; sort_order?: number }) => {
    const res = await cardStatusesApi.create(body);
    setItems(prev => [...prev, res.data.data!]);
  }, []);

  const update = useCallback(async (id: number, body: { label?: string; color?: string | null; sort_order?: number; is_active?: boolean }) => {
    const res = await cardStatusesApi.update(id, body);
    setItems(prev => prev.map(i => i.id === id ? res.data.data! : i));
  }, []);

  const remove = useCallback(async (id: number) => {
    try {
      await cardStatusesApi.remove(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      const detail = (e as any)?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : '삭제 실패');
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { items, loading, error, clearError, create, update, remove };
}
