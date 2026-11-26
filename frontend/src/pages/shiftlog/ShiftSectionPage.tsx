import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { V2_OUTLINE } from '../../components/common/v2Styles';

const TABS = [
  { label: '일지 쓰기', path: '/shift/write' },
  { label: '일지 보기', path: '/shift/read' },
  { label: '카드 검색', path: '/shift/explore' },
  { label: '이어지는 업무', path: '/shift/board' },
];

/** 신규 근무일지 — 기존 업무일지와 같은 데이터를 쓰는 새 화면 묶음. */
export function ShiftSectionPage() {
  const navigate = useNavigate();
  const isAdmin = useAuthStore(s => s.currentUser?.role === 'admin');
  const tabs = isAdmin ? [...TABS, { label: '과제 묶기', path: '/shift/merge' }] : TABS;
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-end gap-0 border-b border-slate-200 bg-white px-6 pt-2 dark:border-slate-700 dark:bg-[#0f172a] v2:border-[var(--v2-line)] v2:bg-[var(--v2-panel)] v2:px-4 v2:pt-0">
        {tabs.map(t => (
          <NavLink key={t.path} to={t.path}
            className={({ isActive }) => `whitespace-nowrap border-b-2 px-5 py-2 text-[13px] font-semibold transition v2:px-3.5 v2:pb-2.5 v2:pt-3 ${isActive
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 v2:border-[var(--v2-accent)] v2:text-[var(--v2-accent)]'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 v2:font-medium v2:text-[var(--v2-muted)]'}`}>
            {t.label}
          </NavLink>
        ))}
        <span className="flex-1" />
        <button type="button" onClick={() => navigate('/logs')}
          className={`mb-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-slate-500 hover:text-blue-600 dark:border-slate-600 dark:text-slate-400 v2:mb-2 v2:font-medium ${V2_OUTLINE}`}>
          과거 업무일지 보기 ›
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden bg-slate-50 dark:bg-[#0f172a] v2:bg-transparent">
        <Outlet />
      </div>
    </div>
  );
}
