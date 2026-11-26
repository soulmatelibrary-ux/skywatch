import { useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { UNSAFE_NavigationContext as NavigationContext } from 'react-router-dom';
import type { NavigateOptions, To } from 'react-router-dom';
import { interceptNav } from '../../utils/navGuard';

/** 다른 화면으로 가는 이동만 가드에 묻는다 (같은 화면 안 주소 변경·상대 경로는 그대로 통과) */
function leavesPage(to: To): boolean {
  const path = typeof to === 'string' ? to.split(/[?#]/)[0] : to.pathname;
  return !!path && path.startsWith('/') && path !== window.location.pathname;
}

/**
 * 아래 모든 화면의 navigate()·<Link> 를 한 곳에서 가로챈다. 메뉴 버튼(Sidebar·RailNav·TopBarV2·SkynetNavGroup)이
 * 모두 navigate 를 쓰므로 개별 수정 없이 수정 중 이탈 경고가 동작한다. 뒤로가기(go)는 막지 못한다.
 */
export function NavGuardProvider({ children }: { children: ReactNode }) {
  const { navigator, ...rest } = useContext(NavigationContext);
  const guarded = useMemo(() => ({
    ...navigator,
    push: (to: To, state?: unknown, opts?: NavigateOptions) => { const go = () => navigator.push(to, state, opts); if (!leavesPage(to) || !interceptNav(go)) go(); },
    replace: (to: To, state?: unknown, opts?: NavigateOptions) => { const go = () => navigator.replace(to, state, opts); if (!leavesPage(to) || !interceptNav(go)) go(); },
  }), [navigator]);
  return <NavigationContext.Provider value={{ ...rest, navigator: guarded }}>{children}</NavigationContext.Provider>;
}
