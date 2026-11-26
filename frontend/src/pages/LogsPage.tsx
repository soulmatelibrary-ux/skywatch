import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogsRefreshContext } from '../context/LogsRefreshContext';

const TABS = [
  { label: '업무일지 조회', path: '/logs' },
] as const;

export function LogsPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  function handleTabClick(tabPath: string, isActive: boolean) {
    if (isActive) {
      setRefreshKey(k => k + 1);
    } else {
      navigate(tabPath);
    }
  }

  return (
    <LogsRefreshContext.Provider value={refreshKey}>
      <div className="h-full overflow-hidden flex flex-col">
        {/* 새 화면은 상단 바에 제목과 같은 버튼들이 있어 이 줄을 숨긴다 (TopBarV2) */}
        <div className="shrink-0 flex gap-0 px-6 pt-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f172a] v2:hidden">
          {TABS.map(tab => {
            const isActive = tab.path === '/logs'
              ? pathname === '/logs' || pathname === '/logs/'
              : pathname.startsWith(tab.path);
            return (
              <button
                key={tab.path}
                onClick={() => handleTabClick(tab.path, isActive)}
                className={`px-5 py-2 text-[13px] font-semibold border-b-2 transition whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
          <span className="flex-1" />
          <button
            onClick={() => navigate('/shift/explore')}
            className="mb-1.5 mr-2 self-end rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-slate-500 hover:text-blue-600 dark:border-slate-600 dark:text-slate-400"
          >
            카드 검색
          </button>
          <button
            onClick={() => navigate('/shift/board')}
            className="mb-1.5 mr-2 self-end rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-slate-500 hover:text-blue-600 dark:border-slate-600 dark:text-slate-400"
          >
            이어지는 업무
          </button>
          <button
            onClick={() => navigate('/shift/write')}
            className="mb-1.5 self-end rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-slate-500 hover:text-blue-600 dark:border-slate-600 dark:text-slate-400"
          >
            근무일지 작성 ›
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <Outlet />
        </div>
      </div>
    </LogsRefreshContext.Provider>
  );
}
