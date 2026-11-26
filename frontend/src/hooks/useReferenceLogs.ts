import { useCallback, useEffect, useMemo, useState } from 'react';
import { logApi } from '../services/api/logApi';
import { today } from '../utils/dateUtils';
import type { Log, LogCard, LogDetail } from '../types/log';

export interface ReferenceLogItem {
  log: Log;
  detail: LogDetail | null;
  matchedCards: LogCard[];
  searchKeyword: string;
}

function getMonthRange(month: string) {
  const [year, monthNum] = month.split('-').map(Number);
  const start = new Date(year, monthNum - 1, 1);
  const end = new Date(year, monthNum, 0);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

function stripHtml(input: string | null | undefined) {
  return (input ?? '').replace(/<[^>]+>/g, ' ');
}

export function useReferenceLogs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [monthFilter, setMonthFilter] = useState<string | null>(null);
  const [detailMap, setDetailMap] = useState<Record<number, LogDetail>>({});
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const keyword = searchQ.trim();
    const params: Record<string, unknown> = { per_page: 200 };
    if (monthFilter) {
      const { from, to } = getMonthRange(monthFilter);
      params.date_from = from;
      params.date_to = to;
    } else if (!keyword) {
      params.date_to = today();
    }
    if (keyword) {
      params.q = keyword;
    }

    logApi.list(params as any)
      .then(async result => {
        if (cancelled) return;
        const items = result.data.data ?? [];
        setLogs(items);

        if (!keyword) return;
        const details = await Promise.all(
          items.map(async log => {
            try {
              const response = await logApi.get(log.id);
              return response.data.data ?? null;
            } catch {
              return null;
            }
          })
        );

        if (cancelled) return;
        const nextMap: Record<number, LogDetail> = {};
        details.forEach(detail => {
          if (detail) nextMap[detail.id] = detail;
        });
        setDetailMap(prev => ({ ...prev, ...nextMap }));
      })
      .catch(() => {
        if (!cancelled) setLogs([]);
      });

    return () => { cancelled = true; };
  }, [searchQ, monthFilter]);

  const selectLog = useCallback(async (log: Log) => {
    setExpandedLogId(prev => prev === log.id ? null : log.id);
    if (detailMap[log.id]) return;
    try {
      const response = await logApi.get(log.id);
      if (response.data.data) {
        setDetailMap(prev => ({ ...prev, [log.id]: response.data.data! }));
      }
    } catch {
      // ignore
    }
  }, [detailMap]);

  const items = useMemo<ReferenceLogItem[]>(() => {
    const keyword = searchQ.trim().toLowerCase();
    const baseItems = logs.map(log => {
      const detail = detailMap[log.id] ?? null;
      const matchedCards = !keyword || !detail
        ? []
        : detail.cards.filter(card => {
            const attachmentNames = card.attachments.map(a => a.original_name).join(' ');
            const haystack = [
              card.title,
              stripHtml(card.content),
              card.category_name,
              card.status,
              card.completed_by_name,
              card.last_edited_by_name,
              attachmentNames,
            ].join(' ').toLowerCase();
            return haystack.includes(keyword);
          });

      return { log, detail, matchedCards, searchKeyword: keyword };
    });

    // 검색어가 있으면 서버(/logs?q=...) 결과를 그대로 사용한다.
    return baseItems;
  }, [logs, detailMap, searchQ]);

  const resultLabel = searchQ.trim()
    ? `검색 결과 ${items.length}건`
    : monthFilter
      ? `이번 달 최근 ${items.length}건`
      : items.length >= 200
        ? '최근 200건까지 보입니다 · 더 오래된 일지는 월이나 검색어로 찾으세요'
        : `최근 ${items.length}건`;

  return {
    items,
    searchQ,
    setSearchQ,
    monthFilter,
    setMonthFilter,
    expandedLogId,
    selectLog,
    resultLabel,
  };
}
