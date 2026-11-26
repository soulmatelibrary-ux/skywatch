import { useCallback, useEffect, useState } from 'react';
import { skynetApi } from '../../services/api/skynetApi';
import type { SkynetDocStats, SkynetDocument, SkynetSourceDept } from '../../types/skynet';

export type KeywordFilter = 'all' | 'matched';

export function useSkynetDashboard() {
  const [q, setQ] = useState('');
  const [activeQ, setActiveQ] = useState('');
  const [year, setYear] = useState('');
  const [sourceDept, setSourceDept] = useState('');
  const [keywordFilter, setKwFilter] = useState<KeywordFilter>('matched');
  const [pageSize, setPageSizeState] = useState(20);
  const [page, setPage] = useState(1);
  const [docs, setDocs] = useState<SkynetDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [docStats, setDocStats] = useState<SkynetDocStats | null>(null);
  const [sourceDepts, setSourceDepts] = useState<SkynetSourceDept[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [crawling, setCrawling] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: number[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const fetchDocs = useCallback(async (
    p: number,
    kw: string,
    yr: string,
    dept: string,
    size: number,
    kf: KeywordFilter = 'all',
  ) => {
    setLoading(true);
    try {
      const res = await skynetApi.documents({
        q: kw,
        year: yr,
        source_dept: dept,
        keyword_only: kf === 'matched',
        page: p,
        size,
      });
      setDocs(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages ?? 1);
      setPage(p);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    skynetApi.docStats().then(setDocStats).catch(() => {});
    skynetApi.sourceDepts().then(setSourceDepts).catch(() => {});
    skynetApi.years().then(setYears).catch(() => {});
    fetchDocs(1, '', '', '', 20, 'matched');
  }, [fetchDocs]);

  const search = () => {
    setActiveQ(q);
    fetchDocs(1, q, year, sourceDept, pageSize, keywordFilter);
  };

  const clearFilters = () => {
    setQ('');
    setActiveQ('');
    setYear('');
    setSourceDept('');
    setKwFilter('matched');
    fetchDocs(1, '', '', '', pageSize, 'matched');
  };

  const goToPage = (p: number) => fetchDocs(p, activeQ, year, sourceDept, pageSize, keywordFilter);
  const setPageSize = (size: number) => {
    setPageSizeState(size);
    fetchDocs(1, activeQ, year, sourceDept, size, keywordFilter);
  };
  const selectDept = (dept: string) => {
    setSourceDept(dept);
    fetchDocs(1, activeQ, year, dept, pageSize, keywordFilter);
  };
  const selectYear = (yr: string) => {
    setYear(yr);
    fetchDocs(1, activeQ, yr, sourceDept, pageSize, keywordFilter);
  };
  const changeKeywordFilter = (kf: KeywordFilter) => {
    setKwFilter(kf);
    setSelectedIds(new Set());
    fetchDocs(1, activeQ, year, sourceDept, pageSize, kf);
  };

  const crawlNow = async () => {
    setCrawling(true);
    try {
      await skynetApi.crawlStart();
      await skynetApi.docStats().then(setDocStats).catch(() => {});
      await skynetApi.sourceDepts().then(setSourceDepts).catch(() => {});
      await fetchDocs(1, activeQ, year, sourceDept, pageSize, keywordFilter);
    } catch {
      // ignore
    } finally {
      setCrawling(false);
    }
  };

  const saveMemo = useCallback(async (docId: number, memo: string) => {
    await skynetApi.saveDocumentMemo(docId, memo);
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, memo } : d));
  }, []);

  const unmatchSelected = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await skynetApi.unmatchDocuments(ids);
    setSelectedIds(new Set());
    await skynetApi.docStats().then(setDocStats).catch(() => {});
    await skynetApi.sourceDepts().then(setSourceDepts).catch(() => {});
    setDocs(prev => prev.filter(d => !ids.includes(d.id)));
    setTotal(prev => prev - ids.length);
  }, [selectedIds]);

  const matchSelected = useCallback(async (keyword: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || !keyword.trim()) return;
    await skynetApi.matchDocuments(ids, keyword.trim());
    setSelectedIds(new Set());
    await skynetApi.docStats().then(setDocStats).catch(() => {});
    // 전체 모드에서는 행을 제거하지 않고 matched_keyword만 업데이트
    setDocs(prev => prev.map(d => ids.includes(d.id) ? { ...d, matched_keyword: keyword.trim() } : d));
  }, [selectedIds]);

  return {
    q,
    setQ,
    activeQ,
    year,
    sourceDept,
    keywordFilter,
    pageSize,
    page,
    docs,
    total,
    totalPages,
    loading,
    docStats,
    sourceDepts,
    years,
    crawling,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    unmatchSelected,
    matchSelected,
    search,
    clearFilters,
    goToPage,
    setPageSize,
    selectDept,
    selectYear,
    changeKeywordFilter,
    crawlNow,
    saveMemo,
  };
}
