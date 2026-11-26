// SkyNet 게시판 훅 — 페이지네이션, & AND, ! 제외 검색, 통계, 수집 제어
import { useState, useEffect, useCallback } from 'react';
import { skynetApi } from '../../services/api/skynetApi';
import type { SkynetBoardPost, SkynetBoardStats } from '../../types/skynet';

export function useSkynetBoard() {
  const [q, setQ]                     = useState('');
  const [activeQ, setActiveQ]         = useState('');
  const [results, setResults]         = useState<SkynetBoardPost[]>([]);
  const [total, setTotal]             = useState(0);
  const [totalPages, setTotalPages]   = useState(1);
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSizeState]  = useState(30);
  const [loading, setLoading]         = useState(true);
  const [stats, setStats]             = useState<SkynetBoardStats | null>(null);
  const [crawling, setCrawling]       = useState(false);
  const [crawlMsg, setCrawlMsg]       = useState('');

  const fetchPosts = useCallback(async (p: number, keyword: string, size: number) => {
    setLoading(true);
    try {
      const res = await skynetApi.board({ q: keyword, page: p, size });
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

  useEffect(() => {
    skynetApi.boardStats().then(setStats).catch(() => {});
    fetchPosts(1, '', 30);
  }, []);

  const search = () => { setActiveQ(q); fetchPosts(1, q, pageSize); };
  const clearSearch = () => { setQ(''); setActiveQ(''); fetchPosts(1, '', pageSize); };
  const goToPage = (p: number) => fetchPosts(p, activeQ, pageSize);
  const setPageSize = (size: number) => { setPageSizeState(size); fetchPosts(1, activeQ, size); };

  const crawlNow = async () => {
    setCrawling(true);
    setCrawlMsg('게시판 수집 중...');
    try {
      const res = await skynetApi.boardCrawlNow();
      setCrawlMsg(res?.message || (res?.ok ? '수집 완료' : '수집 실패'));
      if (res?.ok && res?.saved > 0) {
        await skynetApi.boardStats().then(setStats).catch(() => {});
        fetchPosts(1, activeQ, pageSize);
      }
    } catch {
      setCrawlMsg('SkyNet 서비스에 연결할 수 없습니다.');
    } finally {
      setCrawling(false);
      setTimeout(() => setCrawlMsg(''), 4000);
    }
  };

  const deletePosts = async (postIds: number[]) => {
    try {
      const res = await skynetApi.deleteBoardPosts(postIds);
      if (res?.ok) {
        await skynetApi.boardStats().then(setStats).catch(() => {});
        const newPage = Math.max(1, page);
        fetchPosts(newPage, activeQ, pageSize);
        return { success: true, message: res.message };
      }
      return { success: false, message: res?.message || '삭제 실패' };
    } catch (error) {
      console.error('Failed to delete board posts:', error);
      return { success: false, message: '삭제 요청 실패' };
    }
  };

  return {
    q, setQ, activeQ,
    results, total, totalPages, page, pageSize, setPageSize, loading,
    stats, crawling, crawlMsg,
    search, clearSearch, goToPage, crawlNow, deletePosts,
  };
}
