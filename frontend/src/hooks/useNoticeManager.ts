import { useCallback, useEffect, useState } from 'react';
import { noticesApi, type NoticeItem } from '../services/api/noticesApi';

export function useNoticeManager() {
  const [items, setItems] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await noticesApi.list();
      setItems(res.data.data ?? []);
    } catch { setError('불러오기 실패'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (body: { text: string; start_date: string; end_date: string }) => {
    const res = await noticesApi.create(body);
    setItems(prev => [res.data.data!, ...prev]);
  }, []);

  const remove = useCallback(async (id: number) => {
    await noticesApi.remove(id);
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  return { items, loading, error, create, remove };
}
