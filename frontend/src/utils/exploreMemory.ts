// 카드 검색 조건 기억 — 일지 보기에 갔다가 뒤로 와도 조건·쪽이 유지된다 (이 탭에서만)
import type { ExploreFilter } from '../hooks/useCardExplore';

const KEY = 'skywatch-shift-explore';

export interface ExploreMemory {
  filter: ExploreFilter;
  groupBy: 'category' | 'thread' | 'shift';
  mode: 'grid' | 'row';
  page: number;
}

export const EXPLORE_DEFAULT: ExploreMemory = { filter: {}, groupBy: 'category', mode: 'grid', page: 1 };

export function loadExploreMemory(): ExploreMemory {
  try {
    const m = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
    if (!m || typeof m.filter !== 'object' || m.filter === null) return EXPLORE_DEFAULT;
    return {
      filter: m.filter,
      groupBy: ['category', 'thread', 'shift'].includes(m.groupBy) ? m.groupBy : 'category',
      mode: m.mode === 'row' ? 'row' : 'grid',
      page: Number.isInteger(m.page) && m.page >= 1 ? m.page : 1,
    };
  } catch { return EXPLORE_DEFAULT; }
}

/** 기본 상태(조건 없음·1쪽·기본 보기)면 저장값을 지운다 — "초기화"가 저장값도 지우는 셈 */
export function saveExploreMemory(m: ExploreMemory) {
  try {
    const isDefault = JSON.stringify(m.filter) === '{}' && m.groupBy === 'category' && m.mode === 'grid' && m.page === 1;
    if (isDefault) sessionStorage.removeItem(KEY); else sessionStorage.setItem(KEY, JSON.stringify(m));
  } catch { /* 저장 불가 환경은 무시 */ }
}

/** 로그인·로그아웃 때 호출 — 다음 근무자에게 앞 사람의 검색 조건이 남지 않게 한다 */
export function clearExploreMemory() {
  try { sessionStorage.removeItem(KEY); } catch { /* 저장 불가 환경은 무시 */ }
}
