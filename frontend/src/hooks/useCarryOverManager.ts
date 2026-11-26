import { useCallback, useEffect, useState } from 'react';
import { carryOverApi, type CarryOverRow } from '../services/api/carryOverApi';

/** enabled=false 면 불러오지 않는다 (관리자가 아닐 때). */
export function useCarryOverManager(enabled = true) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [rows, setRows] = useState<CarryOverRow[]>([]);
  const [edited, setEdited] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (y: number) => {
    setLoading(true); setError(null);
    try {
      const res = await carryOverApi.get(y);
      const data = res.data.data ?? [];
      setRows(data);
      setEdited(Object.fromEntries(data.map(r => [r.user_id, r.hours])));
    } catch { setError('불러오기 실패'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (enabled) load(year); }, [load, year, enabled]);

  const setHours = useCallback((userId: number, hours: number) => {
    setEdited(prev => ({ ...prev, [userId]: hours }));
  }, []);

  const save = useCallback(async () => {
    setSaving(true); setError(null);
    try {
      const payload = Object.entries(edited).map(([uid, h]) => ({
        user_id: Number(uid), hours: h,
      }));
      await carryOverApi.save(year, payload);
      await load(year);
    } catch { setError('저장 실패'); }
    finally { setSaving(false); }
  }, [year, edited, load]);

  return { year, setYear, rows, edited, setHours, loading, saving, error, save, currentYear };
}
