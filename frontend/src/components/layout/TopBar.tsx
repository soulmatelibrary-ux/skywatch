import { useLocation } from 'react-router-dom';
import { useLogReloadBridge } from '../../hooks/useLogReloadBridge';
import { openLogCreatePopup } from '../../utils/openLogPopup';
import { HelpButton } from './HelpButton';
import { NotificationBell } from './NotificationBell';
import { UiSwitchButton } from './UiSwitchButton';

export function TopBar() {
  const location = useLocation();
  useLogReloadBridge();

  const isLogsPage = location.pathname === '/logs' || location.pathname === '/';

  return (
    <>
      <header className="bg-white dark:bg-[#1e293b] border-b border-slate-200 dark:border-slate-700 px-6 h-14 flex items-center justify-between shrink-0 relative">
        <div>
          <UiSwitchButton className="rounded-lg border border-slate-300 px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 transition" />
        </div>
        <div className="flex items-center gap-4">
          <HelpButton className="rounded-lg border border-slate-300 px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 transition" />
          <NotificationBell className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition" />

          {isLogsPage && (
            <button
              onClick={openLogCreatePopup}
              className="flex items-center gap-2 px-4 py-2 bg-[#1e40af] hover:bg-[#1e3a8a] text-white rounded-lg text-[14px] font-medium transition"
            >
              <span className="text-[16px] leading-none">+</span>
              새 일지 작성
            </button>
          )}
        </div>
      </header>

    </>
  );
}
