import { useCallback, useEffect, useState } from 'react';
import { usersApi, type UserAdmin, type UserCreateBody, type UserUpdateBody } from '../services/api/usersApi';

/** enabled=false 면 목록을 불러오지 않는다 (관리자가 아닐 때). 훅은 항상 같은 순서로 불러야 해서 조건부 호출 대신 이 값을 쓴다. */
export function useUserManager(enabled = true) {
  const [items, setItems] = useState<UserAdmin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await usersApi.adminList();
      setItems(res.data.data ?? []);
    } catch {
      setError('사용자 목록 불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (enabled) load(); }, [load, enabled]);

  const create = useCallback(async (body: UserCreateBody) => {
    const res = await usersApi.create(body);
    setItems(prev => [...prev, res.data.data!]);
  }, []);

  const update = useCallback(async (id: number, body: UserUpdateBody) => {
    const res = await usersApi.update(id, body);
    setItems(prev => prev.map(u => u.id === id ? res.data.data! : u));
  }, []);

  const deactivate = useCallback(async (id: number) => {
    await usersApi.deactivate(id);
    setItems(prev => prev.map(u => u.id === id ? { ...u, is_active: false } : u));
  }, []);

  const resetPassword = useCallback(async (id: number, newPassword: string) => {
    await usersApi.resetPassword(id, newPassword);
    await load();
  }, [load]);

  return { items, loading, error, create, update, deactivate, resetPassword };
}
