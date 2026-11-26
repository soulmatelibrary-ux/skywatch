// 페이지 자리 — 오류 경계 + 불러오는 중 표시. 기존 화면·새 화면이 같이 쓴다
import { Component, Suspense, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useUIStore } from '../../store/uiStore';

class RouteErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Route render failed:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full min-h-[320px] items-center justify-center px-6">
          <div className="max-w-xl rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-center text-red-700 shadow-sm dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            <div className="text-[16px] font-bold">화면을 불러오지 못했습니다</div>
            <div className="mt-2 text-[13px] leading-6 text-red-600/90 dark:text-red-300/90">
              새로고침 후 다시 시도해 주세요. 계속 발생하면 콘솔 에러를 확인해야 합니다.
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-red-700 transition"
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function RouteOutlet() {
  const navRefreshKeys = useUIStore(s => s.navRefreshKeys);
  const { pathname } = useLocation();
  const outletKey = `${pathname}:${navRefreshKeys[pathname] ?? 0}`;
  return (
    <RouteErrorBoundary>
      <Suspense
        fallback={
          <div className="flex h-full min-h-[320px] items-center justify-center bg-white/70 dark:bg-slate-900/70">
            <LoadingSpinner size={36} />
          </div>
        }
      >
        <div key={outletKey} className="h-full">
          <Outlet />
        </div>
      </Suspense>
    </RouteErrorBoundary>
  );
}
