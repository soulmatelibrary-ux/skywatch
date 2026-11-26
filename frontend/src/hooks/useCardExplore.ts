import { useEffect, useState } from 'react';
import { shiftLogApi } from '../services/api/shiftLogApi';
import type { ExploreQuery, ExploreResult } from '../types/shiftLog';
import { useAsyncData } from './useAsyncData';

export type ExploreFilter = Omit<ExploreQuery, 'page' | 'per_page'>;

const PER_PAGE = 60;
const VIEWS_KEY = 'sw-explore-views';
const EMPTY: ExploreResult = { items: [], total: 0, category_facets: [], kind_facets: [] };

/** 카드 탐색 — 필터가 바뀌면 1페이지부터 서버에서 다시 조회한다. 검색어는 0.3초 지연. */
export function useCardExplore(filter: ExploreFilter, initialPage = 1) {
  const [q, setQ] = useState(filter.q ?? '');
  useEffect(() => { const t = setTimeout(() => setQ(filter.q ?? ''), 300); return () => clearTimeout(t); }, [filter.q]);
  const key = JSON.stringify({ ...filter, q });
  // 페이지 번호는 조회 조건에 묶어 두어, 조건이 바뀌면 바로 1페이지가 된다 (처음 값만 복원한 쪽 번호)
  const [pageState, setPageState] = useState({ key, page: initialPage });
  const page = pageState.key === key ? pageState.page : 1;
  const setPage = (p: number) => setPageState({ key, page: p });
  const res = useAsyncData<ExploreResult>(
    async () => (await shiftLogApi.explore({ ...filter, q, page, per_page: PER_PAGE })).data.data ?? EMPTY,
    [key, page], EMPTY,
  );
  return { ...res, page, setPage, totalPages: Math.max(1, Math.ceil(res.data.total / PER_PAGE)) };
}

export interface SavedView { name: string; filter: ExploreFilter }

/** 저장된 보기 — 이 브라우저에만 남는 개인 편의 기능. */
export function useSavedViews() {
  const [views, setViews] = useState<SavedView[]>(() => {
    try { return JSON.parse(localStorage.getItem(VIEWS_KEY) ?? '[]'); } catch { return []; }
  });
  function persist(next: SavedView[]) {
    setViews(next);
    try { localStorage.setItem(VIEWS_KEY, JSON.stringify(next)); } catch { /* 저장 불가 환경은 무시 */ }
  }
  return {
    views,
    save: (name: string, filter: ExploreFilter) => persist([...views.filter(v => v.name !== name), { name, filter }]),
    remove: (name: string) => persist(views.filter(v => v.name !== name)),
  };
}
