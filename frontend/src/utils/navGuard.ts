// 화면 이동 가드 — 저장 안 한 입력이 있는 화면(useEditGuard)이 등록하고, 메뉴·링크 이동(NavGuardProvider)이 묻는다.
// 한 곳에서만 처리하므로 사이드바·새 화면 아이콘 줄·상단 바·SkyNet 메뉴를 하나씩 고치지 않는다.
type Interceptor = (go: () => void) => boolean;

let interceptor: Interceptor | null = null;
let bypass = false;

/** 등록하면 이동 직전에 fn 이 불린다. true 를 돌려주면 이동을 멈추고, 나중에 go 를 부르면 이동한다. 해제는 null (내 것일 때만) */
export function setNavInterceptor(fn: Interceptor | null, owner?: Interceptor) {
  if (fn === null && owner && interceptor !== owner) return;
  interceptor = fn;
}

/** 이동을 가로채야 하면 true (go 는 호출하지 않은 상태) */
export function interceptNav(go: () => void): boolean {
  return !bypass && interceptor !== null && interceptor(go);
}

/** "버리고 이동" — 이 안에서 일어나는 이동은 가드를 거치지 않는다 */
export function runUnguarded(fn: () => void) {
  bypass = true;
  try { fn(); } finally { bypass = false; }
}
