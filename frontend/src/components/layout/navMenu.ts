// 사이드 메뉴 정의와 동작 — 기존 화면(Sidebar)과 새 화면(RailNav)이 같이 쓴다
import type React from 'react';
import {
  AlertIcon, BellIcon, BookIcon, BusIcon, CalendarIcon, CheckSquareIcon, ClipboardIcon, FileIcon,
  GlobeIcon, HomeIcon, LockIcon, SearchIcon, SettingsIcon,
} from '../icons';

export const TEAM_LABEL: Record<string, string> = {
  A: 'A조', B: 'B조', C: 'C조', D: 'D조', day: '주간',
};

export type NavIcon = (p: { size?: number; className?: string }) => React.JSX.Element;

export interface NavItem {
  id: string;
  label: string;
  /** 새 화면 아이콘 줄에 두 줄로 쓰는 짧은 이름 */
  short: string;
  /** 새 화면 아이콘 줄 한 줄 이름 (4글자 안팎). 줄이 좁아 스크롤 없이 한 화면에 다 넣기 위함 — 전체 이름은 label 이 마우스 올림 말풍선으로 보인다 */
  rail: string;
  Icon: NavIcon;
  path: string;
  disabled?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: '홈', short: '홈', rail: '홈', Icon: HomeIcon, path: '/home' },
  { id: 'search', label: '통합검색', short: '통합\n검색', rail: '통합검색', Icon: SearchIcon, path: '/search' },
  { id: 'logs', label: '업무일지 조회', short: '업무일지\n조회', rail: '업무일지', Icon: FileIcon, path: '/logs' },
  { id: 'shift', label: '근무일지 작성', short: '근무일지\n작성', rail: '근무일지', Icon: BookIcon, path: '/shift' },
  { id: 'inquiries', label: '문의사항', short: '문의\n사항', rail: '문의사항', Icon: FileIcon, path: '/inquiries' },
  { id: 'issues', label: 'PR관리', short: 'PR\n관리', rail: 'PR관리', Icon: AlertIcon, path: '/issues' },
  { id: 'tasks', label: '업무', short: '업무', rail: '업무', Icon: CheckSquareIcon, path: '/tasks' },
  { id: 'schedule', label: '근무 스케줄', short: '근무\n스케줄', rail: '스케줄', Icon: CalendarIcon, path: '/schedule' },
  { id: 'duty-roster', label: '근무편성', short: '근무\n편성', rail: '근무편성', Icon: ClipboardIcon, path: '' },
  { id: 'commute-calc', label: '통근비 계산', short: '통근비\n계산', rail: '통근비', Icon: BusIcon, path: '' },
  { id: 'notif', label: '알림', short: '알림', rail: '알림', Icon: BellIcon, path: '/notifications' },
  { id: 'spa-viewer', label: '3D 공역관리', short: '3D\n공역', rail: '3D공역', Icon: GlobeIcon, path: '' },
  { id: 'manage', label: '관리', short: '관리', rail: '관리', Icon: SettingsIcon, path: '/settings' },
];

/** 문의사항 아래에 붙는 '관제시스템 문서' (새 창) */
export const TECH_DOCS_ITEM: NavItem = { id: 'tech-docs', label: '관제시스템 문서', short: '관제\n문서', rail: '관제문서', Icon: LockIcon, path: '' };

export const SKYNET_ITEMS: NavItem[] = [
  { id: 'skynet-dashboard', label: '문서 목록', short: '문서\n목록', rail: '문서목록', Icon: HomeIcon, path: '/skynet/dashboard' },
  { id: 'skynet-board', label: '게시판', short: '게시판', rail: '게시판', Icon: FileIcon, path: '/skynet/board' },
  { id: 'skynet-settings', label: '크롤링 설정', short: '크롤링\n설정', rail: '크롤링', Icon: SettingsIcon, path: '/skynet/settings' },
];

/** 지금 주소가 이 메뉴에 속하는지 (/pr-batches 는 PR관리) */
export function isNavActive(item: NavItem, pathname: string): boolean {
  if (!item.path) return false;
  if (item.id === 'issues' && pathname.startsWith('/pr-batches')) return true;
  if (item.id.startsWith('skynet-')) return pathname.startsWith(item.path);
  return pathname === item.path || pathname.startsWith(item.path + '/');
}

function openCentered(url: string, name: string, w: number, h: number) {
  const left = Math.round((screen.width - w) / 2);
  const top = Math.round((screen.height - h) / 2);
  window.open(url, name, `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
}

/** 새 창으로 여는 메뉴면 열고 true. 페이지 이동 메뉴면 false */
export function openNavPopup(id: string): boolean {
  if (id === 'schedule') {
    openCentered(`${window.location.origin}/shift-calendar.html`, 'shift_calendar', 1200, 820);
    return true;
  }
  if (id === 'duty-roster') {
    // 근무편성 도구(정적 HTML, 자료는 /api/duty-roster). 1400px 이면 도구 머리 막대가 한 줄로 들어간다
    openCentered(`${window.location.origin}/duty-roster.html`, 'duty_roster', Math.min(1400, screen.availWidth), Math.min(900, screen.availHeight));
    return true;
  }
  if (id === 'commute-calc') {
    // 통근비 계산기(정적 HTML, 설정·고친 칸은 /api/commute-calc). 근무편성과 같은 크기 — 툴바 한 줄, 31일 달력이 가로 스크롤 없이 들어간다
    openCentered(`${window.location.origin}/commute-calc.html`, 'commute_calc', Math.min(1400, screen.availWidth), Math.min(900, screen.availHeight));
    return true;
  }
  if (id === 'spa-viewer') {
    openCentered(`${window.location.protocol}//${window.location.hostname}:7070`, 'spa_viewer', 1400, 900);
    return true;
  }
  if (id === 'tech-docs') {
    // 마지막으로 연 창 위치·크기 기억 (관제시스템 문서 팝업이 저장)
    let b = { width: 1200, height: 850, left: -1, top: -1 };
    try { const s = localStorage.getItem('techDocPopupBounds'); if (s) b = { ...b, ...JSON.parse(s) }; } catch { /* 기본값 */ }
    const w = Math.max(600, b.width);
    const h = Math.max(400, b.height);
    const left = b.left >= 0 ? Math.min(b.left, screen.width - w) : Math.round((screen.width - w) / 2);
    const top = b.top >= 0 ? Math.min(b.top, screen.height - h) : Math.round((screen.height - h) / 2);
    window.open('/tech-docs-popup', 'techDocs', `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
    return true;
  }
  return false;
}
