import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { runUnguarded, setNavInterceptor } from '../utils/navGuard';

/**
 * 수정 중인 카드가 있을 때 화면을 떠나려 하면 막고 확인받는다.
 * BrowserRouter 라 useBlocker 를 쓸 수 없어 새로고침·창 닫기(beforeunload)와 앱 안 링크 클릭을 가로채고,
 * 메뉴 버튼의 navigate 는 NavGuardProvider(AppLayout)가 navGuard 로 이 훅에 묻는다.
 * 화면 안 이동 버튼은 guard(fn) 로 감싼다. 브라우저 뒤로가기는 막지 못한다.
 */
export function useEditGuard() {
  const navigate = useNavigate();
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<(() => void) | null>(null);

  const guard = useCallback((fn: () => void) => {
    if (dirty) setPending(() => fn); else fn();
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return undefined;
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname + url.search === window.location.pathname + window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setPending(() => () => navigate(url.pathname + url.search + url.hash));
    };
    const ask = (go: () => void) => { setPending(() => go); return true; };
    setNavInterceptor(ask);
    window.addEventListener('beforeunload', onUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      setNavInterceptor(null, ask);
      window.removeEventListener('beforeunload', onUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty, navigate]);

  const stay = () => setPending(null);
  // 이동하면 수정 상자가 사라지면서(unmount) dirty 가 스스로 풀린다. 같은 근무로 이동해 상자가 남으면 dirty 도 그대로 둔다.
  const leave = () => { const fn = pending; setPending(null); if (fn) runUnguarded(fn); };
  return { dirty, setDirty, guard, pending: pending !== null, stay, leave };
}
