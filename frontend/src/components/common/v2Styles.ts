// 새 화면(v2) 전용 덧칠 클래스 — 기존 클래스 뒤에 붙이면 .ui-v2 틀 안에서만 적용된다.
// 색은 index.css 의 --v2-* 변수(라이트/다크 값이 따로 있음)를 쓴다.

/** 흰 패널: 1px 테두리, 모서리 6px, 그림자 없음 */
export const V2_PANEL = 'v2:rounded-md v2:border-[var(--v2-line)] v2:bg-[var(--v2-panel)] v2:shadow-none';
/** 패널 머리글: 44px, 아래 옅은 선 */
export const V2_PANEL_HEAD = 'v2:min-h-[44px] v2:border-[var(--v2-line-soft)] v2:py-2';
/** 주 버튼 */
export const V2_PRIMARY = 'v2:rounded-md v2:bg-[var(--v2-accent)] v2:text-[var(--v2-accent-text)] v2:hover:brightness-110';
/** 보조(테두리) 버튼 */
export const V2_OUTLINE = 'v2:rounded-md v2:border-[var(--v2-line)] v2:bg-[var(--v2-panel)] v2:hover:bg-[var(--v2-hover)]';
/** 입력칸·선택칸 */
export const V2_INPUT = 'v2:rounded-md v2:border-[var(--v2-line)] v2:bg-[var(--v2-panel)]';
/** 세그먼트(묶음 버튼) — 선택된 칸 / 나머지 칸 */
export const V2_SEG_ON = 'v2:bg-[var(--v2-accent)] v2:text-[var(--v2-accent-text)]';
export const V2_SEG_OFF = 'v2:bg-[var(--v2-panel)]';
/** 목록 줄: 왼쪽 색 띠(--edge 를 style 로 넘김) + 마우스 올림 */
export const V2_ROW = 'v2:shadow-[inset_3px_0_0_var(--edge,transparent)] v2:border-[var(--v2-line-soft)] v2:hover:bg-[var(--v2-hover)]';
/** 안내 띠(주의·지연 등): 왼쪽 굵은 선 */
export const V2_NOTICE = 'v2:rounded-md v2:border-l-4';
/** 수정 중 카드 상자: 왼쪽 굵은 강조선 + 옅은 강조 바탕 */
export const V2_EDIT_BOX = 'v2:rounded-md v2:border-[var(--v2-accent)] v2:bg-[var(--v2-accent-soft)] v2:shadow-[inset_3px_0_0_var(--v2-accent)]';
/** 윤곽만 있는 작은 버튼 (수정·취소 등) */
export const V2_GHOST_BTN = 'v2:rounded-md v2:border-[var(--v2-line)] v2:bg-[var(--v2-panel)] v2:hover:bg-[var(--v2-hover)]';
/** 근무 구분색 띠 — style 의 --band 로 넘긴다 (예: style={{ '--band': V2_SHIFT_BAND[shift] }}) */
export const V2_SHIFT_BAND: Record<string, string> = {
  주간: 'var(--v2-day-band)', 야간: 'var(--v2-night-band)', 주야: 'var(--v2-dn-band)',
};
