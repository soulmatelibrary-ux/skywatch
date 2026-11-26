// 문의사항 목록 조회 및 필터 상태 관리
import { useCallback, useRef, useState } from 'react';
import { inquiryApi } from '../services/api/inquiryApi';
import type { Inquiry } from '../types/inquiry';
import { useUIStore } from '../store/uiStore';

export type SortOrder = 'asc' | 'desc';

export function useInquiryList() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<string | null>(null);
  const [order, setOrder] = useState<SortOrder>('desc');
  const seq = useRef(0);
  const addToast = useUIStore((s) => s.addToast);

  // 현재 필터·페이지 그대로 재조회 (편집/삭제 후에도 페이지 유지)
  const fetchList = useCallback(async () => {
    const my = ++seq.current;
    try {
      setIsLoading(true);
      const resp = await inquiryApi.list({
        year: year ?? undefined,
        month: month ?? undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        category: category || undefined,
        status: status || undefined,
        q: searchQuery || undefined,
        page,
        per_page: perPage,
        sort: sort || undefined,
        order,
      });
      if (my !== seq.current) return; // 늦게 도착한 이전 응답 무시
      const items = resp.data.data?.items || [];
      // 마지막 페이지의 마지막 건 삭제 시 이전 페이지로 이동
      if (items.length === 0 && page > 1) {
        setPage(page - 1);
        return;
      }
      setInquiries(items);
      setTotal(resp.data.data?.total || 0);
    } catch (error) {
      if (my === seq.current) addToast('목록 조회 실패', 'error');
    } finally {
      if (my === seq.current) setIsLoading(false);
    }
  }, [year, month, dateFrom, dateTo, category, status, searchQuery, page, perPage, sort, order, addToast]);

  const handleFilterChange = useCallback(({
    year: y,
    month: m,
    date_from: df,
    date_to: dt,
    category: c,
    status: s,
    query: q,
  }: {
    year?: number | null;
    month?: number | null;
    date_from?: string | null;
    date_to?: string | null;
    category?: string | null;
    status?: string | null;
    query?: string;
  }) => {
    if (y !== undefined) setYear(y);
    if (m !== undefined) setMonth(m);
    if (df !== undefined) setDateFrom(df);
    if (dt !== undefined) setDateTo(dt);
    if (c !== undefined) setCategory(c);
    if (s !== undefined) setStatus(s);
    if (q !== undefined) setSearchQuery(q);
    setPage(1);
  }, []);

  // 같은 컬럼 재클릭 시 desc → asc → 기본 정렬 순환
  const toggleSort = useCallback((key: string) => {
    if (sort !== key) { setSort(key); setOrder('desc'); }
    else if (order === 'desc') setOrder('asc');
    else { setSort(null); setOrder('desc'); }
    setPage(1);
  }, [sort, order]);

  // 저장 응답으로 해당 행만 교체 (전체 재조회 없이)
  const replaceItem = useCallback((updated: Inquiry) => {
    setInquiries(prev => prev.map(i => (i.id === updated.id ? updated : i)));
  }, []);

  return {
    inquiries,
    total,
    page,
    perPage,
    isLoading,
    year,
    month,
    dateFrom,
    dateTo,
    category,
    status,
    searchQuery,
    sort,
    order,
    setPage,
    setPerPage,
    handleFilterChange,
    toggleSort,
    replaceItem,
    refresh: fetchList,
    fetchList,
  };
}
