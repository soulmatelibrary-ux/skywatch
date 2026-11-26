import { useEffect, useState } from 'react';
import { logApi } from '../services/api/logApi';
import type { Log, LogDetail } from '../types/log';

const REPRESENTATIVE_KEYWORDS = [
  '관제', '장애', '복구', '점검', '이관', '문의', '분석', '정비', '배포', '인터페이스',
  '프로그램', '서버', '네트워크', 'DB', '데이터베이스', 'API', '모니터링', '트래픽', '알람', '백업',
  '보안', '권한', '인증', '로그', '리포트', '회의', '인수인계', '테스트',
];

const STOP_WORDS = ['일지', '주간', '야간', '주야', '비번', '휴가'];

function buildMonthRange(month: string): { from?: string; to?: string } {
  if (!month) return {};
  const [y, m] = month.split('-').map(Number);
  if (!y || !m) return {};
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

export function getRepresentativeKeyword(log: Log): string {
  const source = `${log.title ?? ''} ${log.author_name ?? ''}`.trim();
  if (!source) return '키워드 없음';
  const normalized = source
    .replace(log.date, ' ')
    .replace(/\[[^\]]+\]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (const kw of REPRESENTATIVE_KEYWORDS) {
    if (normalized.toLowerCase().includes(kw.toLowerCase())) return kw;
  }
  const words = normalized.split(' ').map(w => w.trim()).filter(Boolean)
    .filter(w => !STOP_WORDS.includes(w))
    .filter(w => w !== log.author_name)
    .sort((a, b) => b.length - a.length);
  return words[0] ?? '키워드 없음';
}

export function useReferencePanel() {
  const [query, setQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [tab, setTab] = useState<'list' | 'detail'>('list');
  const [logs, setLogs] = useState<Log[]>([]);
  const [listPage, setListPage] = useState(1);
  const [listLoading, setListLoading] = useState(false);
  const [hasMoreList, setHasMoreList] = useState(true);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [detail, setDetail] = useState<LogDetail | null>(null);
  const [cardQ, setCardQ] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);

  const hasQuery = query.trim().length > 0;

  useEffect(() => {
    setListPage(1);
    setHasMoreList(true);
    setLogs([]);
  }, [query, monthFilter]);

  useEffect(() => {
    if (!hasQuery && listPage > 1) { setHasMoreList(false); return; }
    const monthRange = buildMonthRange(monthFilter);
    const perPage = hasQuery ? 50 : 10;
    setListLoading(true);
    const today = new Date().toISOString().split('T')[0];
    logApi.list({ q: query || undefined, date_from: monthRange.from, date_to: monthRange.to || today, page: listPage, per_page: perPage })
      .then(r => {
        const items = r.data.data ?? [];
        const pagination = r.data.pagination;
        setLogs(prev => (listPage === 1 ? items : [...prev, ...items]));
        setHasMoreList(pagination ? listPage < pagination.total_pages : items.length === perPage);
      })
      .catch(() => setHasMoreList(false))
      .finally(() => setListLoading(false));
  }, [query, monthFilter, hasQuery, listPage]);

  useEffect(() => {
    if (!selectedLogId) return;
    setDetailLoading(true);
    logApi.get(selectedLogId)
      .then(r => setDetail(r.data.data ?? null))
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  }, [selectedLogId]);

  function selectLog(id: number) {
    setSelectedLogId(id);
    setDetail(null);
    setCardQ('');
    setTab('detail');
  }

  function handleListScroll(e: React.UIEvent<HTMLDivElement>) {
    if (listLoading || !hasMoreList) return;
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) setListPage(prev => prev + 1);
  }

  const selectedLog = logs.find(l => l.id === selectedLogId);
  const filteredCards = detail?.cards.filter(c => !cardQ || c.title.includes(cardQ)) ?? [];

  return {
    query, setQuery, monthFilter, setMonthFilter, tab, setTab,
    logs, listLoading, hasMoreList, selectedLogId,
    detail, cardQ, setCardQ, detailLoading,
    hasQuery, selectedLog, filteredCards,
    selectLog, handleListScroll,
  };
}
