import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api/authApi';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { clearExploreMemory } from '../utils/exploreMemory';

export function useLogin() {
  const navigate = useNavigate();
  const { setCurrentUser } = useAuthStore();
  const { addToast } = useUIStore();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async () => {
    if (!loginId.trim() || !password.trim()) {
      setError('사번과 비밀번호를 입력해 주세요.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const res = await authApi.login({ login_id: loginId.trim(), password });
      console.log('[login] 응답:', res.status, res.data);
      clearExploreMemory();
      setCurrentUser(res.data.data ?? null);
      navigate('/logs', { replace: true });
    } catch (err: unknown) {
      console.error('[login] 에러:', err);
      const e = err as { response?: { status?: number; data?: { detail?: string } }; message?: string };
      const msg = e?.response?.data?.detail ?? e?.message ?? '사번 또는 비밀번호가 올바르지 않습니다.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [loginId, password, navigate, setCurrentUser]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* 세션이 이미 만료된 경우 무시 */
    } finally {
      clearExploreMemory();
      setCurrentUser(null);
      addToast('로그아웃되었습니다.', 'info');
      navigate('/login', { replace: true });
    }
  }, [navigate, setCurrentUser, addToast]);

  return { loginId, setLoginId, password, setPassword, error, isLoading, login, logout };
}
