import { useCallback, useEffect, useState } from 'react';
import { categoriesApi } from '../services/api/categoriesApi';
import type { CardCategory } from '../types/log';

export function useCategoryManager() {
  const [items, setItems] = useState<CardCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await categoriesApi.list();
      setItems(res.data.data ?? []);
    } catch { setError('불러오기 실패'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (body: { name: string; color?: string | null; sort_order?: number }) => {
    const res = await categoriesApi.create(body);
    setItems(prev => [...prev, res.data.data!]);
  }, []);

  const update = useCallback(async (id: number, body: { name?: string; color?: string | null; sort_order?: number; is_active?: boolean }) => {
    const res = await categoriesApi.update(id, body);
    setItems(prev => prev.map(i => i.id === id ? res.data.data! : i));
  }, []);

  const remove = useCallback(async (id: number) => {
    await categoriesApi.remove(id);
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  return { items, loading, error, create, update, remove };
}
