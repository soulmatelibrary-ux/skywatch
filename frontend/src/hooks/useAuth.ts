import { useEffect } from 'react';
import { authApi } from '../services/api/authApi';
import { useAuthStore } from '../store/authStore';

/** 앱 최초 마운트 시 세션 확인 */
export function useAuthInit() {
  const { setCurrentUser, setLoading } = useAuthStore();

  useEffect(() => {
    authApi.me()
      .then((res) => setCurrentUser(res.data.data ?? null))
      .catch(() => setCurrentUser(null))
      .finally(() => setLoading(false));
  }, [setCurrentUser, setLoading]);
}
