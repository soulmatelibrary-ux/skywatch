import { useState, useCallback, useRef } from 'react';
import { searchApi } from '../services/api/searchApi';
import type { UnifiedSearchItem } from '../types/search';

// 통합검색 대상은 SkyWatch 자료만 (SkyNet 수집 문서/게시판은 제외)
export interface TabResults {
  all: UnifiedSearchItem[];
  work: UnifiedSearchItem[];   // 업무일지 (카드·일지·댓글)
  issue: UnifiedSearchItem[];  // 개별 PR
  inquiry: UnifiedSearchItem[];
  techDoc: UnifiedSearchItem[];
}

const EMPTY: TabResults = { all: [], work: [], issue: [], inquiry: [], techDoc: [] };
const WORK_TYPES = new Set(['card', 'log', 'comment']);

// (target_type, target_id)로 중복 제거
function dedup(items: UnifiedSearchItem[]): UnifiedSearchItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = `${item.target_type}:${item.target_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function useTabSearch() {
  const [results, setResults] = useState<TabResults>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const searchSeqRef = useRef(0);

  const doSearch = useCallback(async (
    q: string,
    opts?: { dateFrom?: string; dateTo?: string },
  ) => {
    if (!q.trim()) { setResults(EMPTY); setHasSearched(false); setIsTruncated(false); return; }
    const seq = ++searchSeqRef.current;
    setIsLoading(true);
    let items: UnifiedSearchItem[];
    try {
      // SkyWatch 전체 (카드+댓글+로그벡터+문의+기술문서)
      const res = await searchApi.unified({ q, source: 'skywatch', page_size: 500, date_from: opts?.dateFrom, date_to: opts?.dateTo });
      items = res?.data?.data?.items ?? [];
    } catch {
      items = [];
    }
    if (seq !== searchSeqRef.current) return;
    const all = dedup(items);
    const work = all.filter(i => WORK_TYPES.has(i.target_type));
    const issue = all.filter(i => i.target_type === 'issue');
    const inquiry = all.filter(i => i.target_type === 'inquiry');
    const techDoc = all.filter(i => i.target_type === 'tech_doc');
    // 전체 탭: 백엔드 점수(0~1 관련도) 내림차순
    setResults({ all: [...all].sort((a, b) => b.score - a.score), work, issue, inquiry, techDoc });
    setIsTruncated(items.length >= 500);
    setIsLoading(false);
    setHasSearched(true);
  }, []);

  return { results, isLoading, hasSearched, isTruncated, doSearch };
}
