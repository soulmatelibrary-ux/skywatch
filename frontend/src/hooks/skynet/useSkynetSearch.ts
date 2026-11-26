// SkyNet 통합 검색 훅 — & AND 조건, ! 제외 조건, 페이지네이션, 자연어 검색 모드
import { useState, useCallback } from 'react';
import { skynetApi } from '../../services/api/skynetApi';
import type { SkynetSearchItem } from '../../types/skynet';

export function useSkynetSearch() {
  const [q, setQ] = useState('');
  const [submittedQ, setSubmittedQ] = useState('');
  const [results, setResults] = useState<SkynetSearchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(50);
  const [loading, setLoading] = useState(false);
  const [semantic, setSemantic] = useState(false);

  const fetch = useCallback(async (keyword: string, p: number, size: number, sem: boolean) => {
    if (!keyword.trim()) return;
    setLoading(true);
    try {
      const res = await skynetApi.search({ q: keyword, page: p, size, semantic: sem });
      setResults(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
      setPage(p);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const submit = (keyword: string) => {
    setSubmittedQ(keyword);
    fetch(keyword, 1, pageSize, semantic);
  };

  const goToPage = (p: number) => fetch(submittedQ, p, pageSize, semantic);

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    if (submittedQ) fetch(submittedQ, 1, size, semantic);
  };

  const toggleSemantic = () => {
    const next = !semantic;
    setSemantic(next);
    if (submittedQ) fetch(submittedQ, 1, pageSize, next);
  };

  return { q, setQ, submittedQ, results, total, totalPages, page, pageSize, setPageSize, loading, submit, goToPage, semantic, toggleSemantic };
}
