import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { logApi } from '../services/api/logApi';
import { parseNaturalQuery } from '../utils/parseNaturalQuery';
import type { Log } from '../types/log';
import type { Pagination } from '../types';

interface LogsFilter {
  page: number;
  per_page: number;
  team?: string;
  date_from?: string;
  date_to?: string;
  q?: string;
  category_id?: number;
  exclude_notice?: boolean;
}

function loadHideNotice(): boolean {
  try { return localStorage.getItem('skywatch_hide_notice') !== 'false'; } catch { return true; }
}

export function useLogsList() {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') ?? '';

  const [logs, setLogs] = useState<Log[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hideNotice, setHideNoticeRaw] = useState<boolean>(loadHideNotice);
  const [newNoticeIds, setNewNoticeIds] = useState<Set<number>>(new Set());
  const hideNoticeRef = useRef(hideNotice);
  const [filter, setFilter] = useState<LogsFilter>(() => ({
    page: 1, per_page: 50, exclude_notice: loadHideNotice(),
    ...(searchQuery ? parseNaturalQuery(searchQuery) : {}),
  }));
  const [searchText, setSearchText] = useState(searchQuery);

  useEffect(() => { hideNoticeRef.current = hideNotice; }, [hideNotice]);

  const fetchLogs = useCallback(async (f: LogsFilter, signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await logApi.list(f);
      if (signal?.aborted) return;
      setLogs(res.data.data ?? []);
      setPagination(res.data.pagination ?? null);
    } catch (err) {
      if (signal?.aborted) return;
      const msg = err instanceof Error ? err.message : '일지 목록을 불러오지 못했습니다.';
      setError(msg);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchLogs(filter, controller.signal);
    return () => controller.abort();
  }, [filter, fetchLogs]);

  // URL query string changes should only react to the actual q value.
  useEffect(() => {
    setSearchText(searchQuery);
    setFilter(f => ({
      page: 1, per_page: f.per_page, exclude_notice: f.exclude_notice,
      ...(searchQuery ? parseNaturalQuery(searchQuery) : {}),
    }));
  }, [searchQuery]);

  const checkNewNotices = useCallback(async () => {
    try {
      const res = await logApi.list({ per_page: 10 });
      const notices = (res.data.data ?? []).filter(l => l.shift_type === '공지');
      if (!notices.length) return;
      const raw = (() => { try { return localStorage.getItem('skywatch_notice_last_seen'); } catch { return null; } })();
      const lastSeen = raw ? new Date(raw).getTime() : 0;
      const fresh = notices.filter(n => new Date(n.created_at).getTime() > lastSeen);
      if (!fresh.length) return;
      setNewNoticeIds(new Set(fresh.map(n => n.id)));
      setHideNoticeRaw(false);
      try { localStorage.setItem('skywatch_hide_notice', 'false'); } catch {}
      try { localStorage.setItem('skywatch_notice_last_seen', new Date().toISOString()); } catch {}
      setFilter(f => ({ ...f, page: 1, exclude_notice: false }));
    } catch {}
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (loadHideNotice()) void checkNewNotices(); }, []);

  useEffect(() => {
    try {
      const bc = new BroadcastChannel('skywatch-log');
      bc.onmessage = (e) => {
        if (e.data?.type === 'logs-reload' && hideNoticeRef.current) void checkNewNotices();
      };
      return () => bc.close();
    } catch {}
  }, [checkNewNotices]);

  const setHideNotice = useCallback((val: boolean) => {
    setHideNoticeRaw(val);
    try { localStorage.setItem('skywatch_hide_notice', String(val)); } catch {}
    if (!val) {
      try { localStorage.setItem('skywatch_notice_last_seen', new Date().toISOString()); } catch {}
      setNewNoticeIds(new Set());
    }
    setFilter(f => ({ ...f, page: 1, exclude_notice: val }));
  }, []);

  const markAsRead = useCallback(async (logId: number) => {
    setLogs(prev => prev.map(l => (l.id === logId ? { ...l, is_read: true } : l)));
    try { await logApi.ack(logId); } catch {}
  }, []);

  const search = useCallback((text: string) => {
    setSearchText(text);
    setFilter(f => ({ page: 1, per_page: f.per_page, exclude_notice: f.exclude_notice, ...parseNaturalQuery(text) }));
  }, []);

  const setPage = useCallback((page: number) => { setFilter(f => ({ ...f, page })); }, []);

  const setPerPage = useCallback((per_page: number) => { setFilter(f => ({ ...f, per_page, page: 1 })); }, []);

  const reset = useCallback(() => {
    setSearchText('');
    setFilter(f => ({ page: 1, per_page: f.per_page, exclude_notice: f.exclude_notice }));
  }, []);

  const setTeam = useCallback((team: string | undefined) => { setFilter(f => ({ ...f, page: 1, team })); }, []);

  const setCategoryId = useCallback((category_id: number | undefined) => { setFilter(f => ({ ...f, page: 1, category_id })); }, []);

  const reload = useCallback(() => { fetchLogs(filter); }, [filter, fetchLogs]);

  useEffect(() => {
    const handler = () => fetchLogs(filter);
    window.addEventListener('logs:reload', handler);
    return () => window.removeEventListener('logs:reload', handler);
  }, [filter, fetchLogs]);

  return {
    logs, pagination, isLoading, error, searchText, filter,
    hideNotice, setHideNotice, newNoticeIds,
    markAsRead, search, setPage, setPerPage, reset, reload, setTeam, setCategoryId,
  };
}
