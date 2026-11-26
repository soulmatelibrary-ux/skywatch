// 새 화면 상단 바 — 위치 표시 · 화면 전환 · 알림 · 테마 · 사용자 (기존 사이드바 아래쪽 기능을 옮겨 옴)
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { useUIStore } from '../../../store/uiStore';
import { useLogin } from '../../../hooks/useLogin';
import { useLogReloadBridge } from '../../../hooks/useLogReloadBridge';
import { openLogCreatePopup } from '../../../utils/openLogPopup';
import { LockIcon, MoonIcon, SunIcon } from '../../icons';
import { ChangePasswordPopup } from '../ChangePasswordPopup';
import { HelpButton } from '../HelpButton';
import { NotificationBell } from '../NotificationBell';
import { NAV_ITEMS, SKYNET_ITEMS, TEAM_LABEL, isNavActive } from '../navMenu';
import { UiSwitchButton } from '../UiSwitchButton';

const ICON_BTN = 'relative grid h-8 w-8 place-items-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100';
const OUTLINE = 'rounded-md border border-[#DCE1E8] bg-white px-3 py-1 text-[12px] text-slate-600 transition hover:bg-slate-50 dark:border-[#263243] dark:bg-transparent dark:text-slate-300 dark:hover:bg-white/5';
const GHOST = 'rounded-md px-2.5 py-1 text-[12px] font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5';

export function TopBarV2() {
  useLogReloadBridge();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const { logout } = useLogin();
  const [pwOpen, setPwOpen] = useState(false);

  const skynet = SKYNET_ITEMS.find(i => isNavActive(i, pathname));
  const menu = skynet ?? NAV_ITEMS.find(i => isNavActive(i, pathname));
  const isLogsPage = pathname === '/logs' || pathname === '/';

  return (
    <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-[#DCE1E8] bg-white px-[18px] dark:border-[#263243] dark:bg-[#151E2B]">
      <nav aria-label="현재 위치" className="flex min-w-0 items-center gap-1.5 whitespace-nowrap text-[13px] text-slate-500 dark:text-slate-400">
        {skynet && <><span>SkyNet</span><span aria-hidden>›</span></>}
        <b className="truncate text-[17px] font-bold tracking-[-0.3px] text-slate-800 dark:text-slate-100">{menu?.label ?? (isLogsPage ? '업무일지 조회' : 'SkyWatch')}</b>
      </nav>
      {isLogsPage && (
        <>
          <button onClick={() => navigate('/shift/explore')} className={GHOST}>카드 검색</button>
          <button onClick={() => navigate('/shift/board')} className={GHOST}>이어지는 업무</button>
        </>
      )}
      <div className="flex-1" />
      {isLogsPage && (
        <>
          <button onClick={() => navigate('/shift/write')} className={OUTLINE}>근무일지 작성</button>
          <button onClick={openLogCreatePopup} className="rounded-md bg-[#2160D6] px-3 py-1.5 text-[12px] font-semibold text-white transition hover:brightness-110 dark:bg-[#5B9BF3] dark:text-[#0B1220]">
            + 새 일지 작성
          </button>
          <span className="h-5 w-px bg-[#DCE1E8] dark:bg-[#263243]" aria-hidden />
        </>
      )}
      <HelpButton className={GHOST} />
      <UiSwitchButton className={OUTLINE} />
      <NotificationBell className={ICON_BTN} size={18} />
      <button onClick={toggleTheme} className={ICON_BTN} aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'} title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}>
        {theme === 'dark' ? <SunIcon size={17} /> : <MoonIcon size={17} />}
      </button>
      {currentUser && (
        <div className="flex items-center gap-2 border-l border-[#EBEEF2] pl-3 dark:border-[#1E2938]">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[#EAF1FD] text-[12px] font-bold text-[#2160D6] dark:bg-[#1B2A44] dark:text-[#5B9BF3]">
            {currentUser.name.slice(0, 1)}
          </span>
          <span className="hidden whitespace-nowrap text-[13px] text-slate-800 md:inline dark:text-slate-100">
            {currentUser.name} <small className="text-slate-500 dark:text-slate-400">{TEAM_LABEL[currentUser.team] ?? currentUser.team}</small>
          </span>
          <button onClick={() => setPwOpen(true)} className={ICON_BTN} aria-label="비밀번호 변경" title="비밀번호 변경"><LockIcon size={15} /></button>
          <button onClick={logout} className={OUTLINE}>로그아웃</button>
        </div>
      )}
      {pwOpen && <ChangePasswordPopup onClose={() => setPwOpen(false)} />}
    </header>
  );
}
