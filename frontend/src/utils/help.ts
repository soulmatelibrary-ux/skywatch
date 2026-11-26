/** 주소 → 도움말(public/help/index.html) 안의 절 이름 */
export function helpSection(pathname: string): string {
  if (pathname.startsWith('/shift/read')) return 'shift-read';
  if (pathname.startsWith('/shift/explore')) return 'shift-explore';
  if (pathname.startsWith('/shift/board')) return 'shift-board';
  if (pathname.startsWith('/shift/write')) return 'shift-write';
  if (pathname.startsWith('/shift')) return 'shift';
  if (pathname === '/' || pathname.startsWith('/logs') || pathname.startsWith('/log')) return 'logs';
  if (pathname.startsWith('/inquir')) return 'inquiry';
  if (pathname.startsWith('/tech-docs')) return 'techdocs';
  if (pathname.startsWith('/issues') || pathname.startsWith('/pr-batches')) return 'pr';
  return '';
}

/** 사용자 도움말 창 열기 — 지금 보고 있는 메뉴의 설명으로 바로 간다 */
export function openHelp(section = '') {
  const w = Math.min(1180, window.screen.availWidth - 80);
  const h = window.screen.availHeight - 80;
  window.open(`/help/index.html${section ? `#${section}` : ''}`, 'skywatch_help',
    `width=${w},height=${h},left=${Math.max(0, window.screen.availWidth - w - 20)},top=20,resizable=yes,scrollbars=yes`);
}
