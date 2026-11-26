// SkyNet 문서 검색 상태 및 데이터 패칭 훅
import { useState, useEffect } from 'react';
import { skynetApi } from '../../services/api/skynetApi';
import type { SkynetDocument, SkynetDepartment } from '../../types/skynet';

const PAGE_SIZE = 30;

type Filters = { q: string; dept: string; year: string; keyword_only: boolean };

export function useSkynetDocuments() {
  const [q, setQ]       = useState('');
  const [dept, setDept] = useState('');
  const [year, setYear] = useState(() => new Date().getFullYear().toString());
  const [keyword_only, setKeywordOnly] = useState(false);

  const [results, setResults]         = useState<SkynetDocument[]>([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true); // 초기 로딩 중 상태로 시작
  const [activeFilters, setActiveFilters] = useState<Filters>({ q: '', dept: '', year: new Date().getFullYear().toString(), keyword_only: false });

  const [departments, setDepartments] = useState<SkynetDepartment[]>([]);
  const [years, setYears]             = useState<string[]>([]);

  useEffect(() => {
    skynetApi.departments().then(setDepartments).catch(() => {});
    skynetApi.years().then(setYears).catch(() => {});
    const currentYear = new Date().getFullYear().toString();
    fetchDocs(1, true, { q: '', dept: '', year: currentYear, keyword_only: false });
  }, []);

  const fetchDocs = async (p: number, reset: boolean, filters: Filters) => {
    setLoading(true);
    try {
      const res = await skynetApi.documents({ ...filters, page: p, size: PAGE_SIZE });
      setTotal(res.total);
      setPage(p);
      setResults(prev => (reset ? res.items : [...prev, ...res.items]));
    } catch {
      // 네트워크 오류 무시
    } finally {
      setLoading(false);
    }
  };

  const search = () => {
    const filters: Filters = { q, dept, year, keyword_only };
    setActiveFilters(filters);
    fetchDocs(1, true, filters);
  };

  const loadMore = () => fetchDocs(page + 1, false, activeFilters);

  const hasMore = results.length < total;

  return {
    q, setQ, dept, setDept, year, setYear, keyword_only, setKeywordOnly,
    results, total, loading,
    search, loadMore, hasMore,
    departments, years,
  };
}
