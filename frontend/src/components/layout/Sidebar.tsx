import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useNotifStore } from '../../store/notifStore';
import { useLogin } from '../../hooks/useLogin';
import { MenuIcon, UserIcon, LogoutIcon, MoonIcon, SunIcon, LockIcon } from '../icons';
import { ChangePasswordPopup } from './ChangePasswordPopup';
import { SkynetNavGroup } from './SkynetNavGroup';
import { NAV_ITEMS, TEAM_LABEL, isNavActive, openNavPopup } from './navMenu';

const ICON_COLORS: Record<string, string> = {
  home: 'text-sky-300',
  search: 'text-cyan-300',
  logs: 'text-emerald-300',
  shift: 'text-sky-200',
  inquiries: 'text-amber-300',
  issues: 'text-rose-300',
  tasks: 'text-violet-300',
  schedule: 'text-lime-300',
  'duty-roster': 'text-lime-200',
  'commute-calc': 'text-green-300',
  notif: 'text-orange-300',
  'spa-viewer': 'text-fuchsia-300',
  manage: 'text-teal-300',
};

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, theme, toggleTheme, bumpNavRefresh } = useUIStore();
  const { currentUser } = useAuthStore();
  const { unreadCount } = useNotifStore();
  const { logout } = useLogin();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [pwPopupOpen, setPwPopupOpen] = useState(false);
  return (
    <aside
      className="flex flex-col shrink-0 bg-[#1e3a8a] dark:bg-[#0f172a] text-white overflow-hidden transition-all duration-200 border-r border-blue-800/70 dark:border-slate-700"
      style={{ width: sidebarOpen ? 224 : 56 }}
    >
      <div className="flex h-14 items-center gap-3 px-4 border-b border-blue-800 dark:border-slate-700 shrink-0">
        <button onClick={toggleSidebar} className="text-blue-300 hover:text-white transition shrink-0" aria-label="사이드바 토글">
          <MenuIcon size={20} />
        </button>
        {sidebarOpen && <span className="text-[20px] font-extrabold tracking-tight whitespace-nowrap">Skywatch</span>}
      </div>

      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
        {NAV_ITEMS.map(item => {
          const { id, label, Icon, path, disabled } = item;
          const isActive = isNavActive(item, pathname);
          const isNotif = id === 'notif';

          return (
            <React.Fragment key={id}>
              {(id === 'manage' || id === 'spa-viewer') && (
                <div className="flex items-center gap-2 px-3 py-0.5 mt-0.5">
                  <div className="flex-1 border-t border-blue-600 dark:border-slate-600" />
                </div>
              )}
              <button
                onClick={() => {
                  if (disabled) return;
                  if (openNavPopup(id)) return;
                  bumpNavRefresh(path);
                  navigate(path);
                }}
                disabled={!!disabled}
                className={[
                  'w-full relative flex items-center gap-2 px-3 py-1.5 rounded-lg transition text-[14px] font-medium',
                  isActive
                    ? 'bg-blue-700 dark:bg-blue-900 text-white'
                    : 'text-blue-100 hover:bg-blue-800 dark:hover:bg-slate-700 hover:text-white',
                  disabled ? 'opacity-40 cursor-not-allowed' : '',
                ].join(' ')}
              >
                <Icon
                  size={17}
                  className={[
                    'shrink-0 transition-colors drop-shadow-[0_0_6px_rgba(255,255,255,0.12)]',
                    ICON_COLORS[id] ?? 'text-white',
                    isActive ? 'brightness-110' : 'opacity-90',
                  ].join(' ')}
                />
                {sidebarOpen && <span className="whitespace-nowrap">{label}</span>}

                {isNotif && unreadCount > 0 && sidebarOpen && (
                  <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                {isNotif && unreadCount > 0 && !sidebarOpen && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-red-500 border border-white" />
                )}
              </button>
              {isNotif && <SkynetNavGroup sidebarOpen={sidebarOpen} />}
              {id === 'inquiries' && (
                <button
                  onClick={() => openNavPopup('tech-docs')}
                  className="w-full relative flex items-center gap-2 px-3 py-1.5 rounded-lg transition text-[14px] font-medium text-blue-100 hover:bg-blue-800 dark:hover:bg-slate-700 hover:text-white"
                >
                  <LockIcon size={17} className="shrink-0" />
                  {sidebarOpen && <span className="whitespace-nowrap">관제시스템 문서</span>}
                </button>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      <div className="px-2 pb-1 border-t border-blue-800 dark:border-slate-700 pt-1 shrink-0">
        <div className="flex items-center gap-3 px-3 py-0.5 rounded-lg text-blue-100">
          <UserIcon size={16} className="shrink-0" />
          {sidebarOpen && currentUser && (
            <div className="text-left min-w-0 flex-1">
              <div className="text-[12px] font-bold text-white truncate">
                {currentUser.name} ({TEAM_LABEL[currentUser.team] ?? currentUser.team})
              </div>
            </div>
          )}
          {sidebarOpen && (
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
              aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
              className="shrink-0 p-1 rounded-lg text-blue-200 hover:text-white hover:bg-blue-800 dark:hover:bg-slate-700 transition"
            >
              {theme === 'dark' ? <SunIcon size={14} /> : <MoonIcon size={14} />}
            </button>
          )}
        </div>

        {!sidebarOpen && (
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
            aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
            className="w-full flex items-center justify-center py-1 rounded-lg text-blue-200 hover:text-white hover:bg-blue-800 dark:hover:bg-slate-700 transition"
          >
            {theme === 'dark' ? <SunIcon size={14} /> : <MoonIcon size={14} />}
          </button>
        )}

        <div className="mt-1 flex items-center gap-2 px-3">
          <button
            onClick={() => setPwPopupOpen(true)}
            title="비밀번호 변경"
            aria-label="비밀번호 변경"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-blue-200 hover:bg-blue-800 hover:text-white dark:hover:bg-slate-700 transition focus:outline-none focus:ring-2 focus:ring-blue-400/60"
          >
            <LockIcon size={14} className="shrink-0" />
          </button>
          <button
            onClick={logout}
            title="로그아웃"
            aria-label="로그아웃"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-blue-200 hover:bg-blue-800 hover:text-red-300 dark:hover:bg-slate-700 transition focus:outline-none focus:ring-2 focus:ring-blue-400/60"
          >
            <LogoutIcon size={14} className="shrink-0" />
          </button>
        </div>
      </div>

      {pwPopupOpen && <ChangePasswordPopup onClose={() => setPwPopupOpen(false)} />}
    </aside>
  );
}
