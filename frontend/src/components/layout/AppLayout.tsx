import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { NoticeTickerBanner } from './NoticeTickerBanner';
import { RouteOutlet } from './RouteOutlet';
import { AppShellV2 } from './v2/AppShellV2';
import { NavGuardProvider } from './NavGuardProvider';
import { ToastContainer } from '../common/Toast';
import { LogReferencePanelPopup } from '../logs/LogReferencePanelPopup';
import { useNotifInit } from '../../hooks/useNotifications';
import { useUIStore } from '../../store/uiStore';

/** 기존 화면 틀 — 공지 띠 + 펼침 사이드바 + 상단 바 */
function ClassicShell() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#FAFAF8] dark:bg-[#0f172a]">
      {/* 공지 티커 */}
      <NoticeTickerBanner />

      {/* 본체: 사이드바 + 콘텐츠 */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* 메인 콘텐츠 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 min-h-0 overflow-y-auto">
            <RouteOutlet />
          </main>
        </div>
      </div>
    </div>
  );
}

/** 주소는 그대로 두고 바깥 틀만 기존/새 화면 중 사용자가 고른 것으로 그린다 */
export function AppLayout() {
  useNotifInit();
  const { theme, uiVersion, referencePanelOpen, referenceEditor, closeReferencePanel } = useUIStore();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return (
    <NavGuardProvider>
      {uiVersion === 'v2' ? <AppShellV2 /> : <ClassicShell />}

      {/* 전역 토스트 */}
      <ToastContainer />

      {/* 참고일지 팝업 — 업무일지와 독립적으로 동작 */}
      {referencePanelOpen && (
        <LogReferencePanelPopup editor={referenceEditor} onClose={closeReferencePanel} />
      )}
    </NavGuardProvider>
  );
}
