import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,  // httpOnly 쿠키 자동 포함
});

// 401 → 로그인 페이지 자동 이동
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const reqUrl = String(err?.config?.url ?? '');
    const isAuthProbe = reqUrl.includes('/auth/me') || reqUrl.includes('/auth/login');
    const isAlreadyLoginPage = window.location.pathname === '/login';

    if (err.response?.status === 401 && !isAuthProbe && !isAlreadyLoginPage) {
      window.location.assign('/login');
    }
    return Promise.reject(err);
  }
);
