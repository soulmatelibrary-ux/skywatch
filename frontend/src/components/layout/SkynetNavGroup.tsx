// SkyNet 통합 메뉴 그룹 — 구분선 고정 표시
import { useNavigate, useLocation } from 'react-router-dom';
import { BookIcon } from '../icons';
import { SKYNET_ITEMS } from './navMenu';

const BASE_BTN = 'w-full flex items-center gap-3 px-3 rounded-lg transition font-semibold';
const active   = 'bg-blue-700 dark:bg-blue-900 text-white';
const inactive = 'text-blue-100 hover:bg-blue-800 dark:hover:bg-slate-700 hover:text-white';

export function SkynetNavGroup({ sidebarOpen }: { sidebarOpen: boolean }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <>
      {/* 구분선 */}
      <div className="flex items-center gap-2 px-3 py-1 mt-1">
        <div className="flex-1 border-t border-blue-600 dark:border-slate-600" />
        {sidebarOpen && (
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-300 dark:text-slate-500 tracking-widest uppercase shrink-0">
            <BookIcon size={12} />
            SkyNet
          </span>
        )}
        <div className="flex-1 border-t border-blue-600 dark:border-slate-600" />
      </div>

      {/* 하위 항목 — 항상 표시 */}
      <div className="space-y-0.5">
        {SKYNET_ITEMS.map(({ id, label, Icon, path }) => {
          const isActive = pathname.startsWith(path);
          return (
            <button
              key={id}
              onClick={() => navigate(path)}
              className={`${BASE_BTN} py-2 text-[15px] ${isActive ? active : inactive}`}
            >
              <Icon size={20} className="shrink-0" />
              {sidebarOpen && <span className="whitespace-nowrap">{label}</span>}
            </button>
          );
        })}
      </div>
    </>
  );
}
