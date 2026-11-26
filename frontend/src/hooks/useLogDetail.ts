import { useCallback, useEffect, useState } from 'react';
import { logApi, cardApi } from '../services/api/logApi';
import type { LogDetail, ReadStatus } from '../types/log';

export function useLogDetail(logId: number | null) {
  const [detail, setDetail] = useState<LogDetail | null>(null);
  const [readStatus, setReadStatus] = useState<ReadStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [readPanelOpen, setReadPanelOpen] = useState(false);

  useEffect(() => {
    if (!logId) { setDetail(null); setReadStatus(null); return; }
    let cancelled = false;
    setIsLoading(true);
    Promise.all([
      logApi.get(logId),
      logApi.ack(logId),
      logApi.getReads(logId).catch(() => null),
    ]).then(([detailRes, , readsRes]) => {
      if (!cancelled) {
        setDetail(detailRes.data.data ?? null);
        if (readsRes) setReadStatus(readsRes.data.data ?? null);
      }
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [logId]);

  const loadReadStatus = useCallback(async () => {
    if (!logId) return;
    const res = await logApi.getReads(logId);
    setReadStatus(res.data.data ?? null);
    setReadPanelOpen(true);
  }, [logId]);

  const toggleReadPanel = useCallback(() => {
    if (!readPanelOpen) loadReadStatus();
    else setReadPanelOpen(false);
  }, [readPanelOpen, loadReadStatus]);

  const acknowledge = useCallback(async () => {
    if (!logId || !detail) return;
    if (detail.has_acked) return;
    await logApi.acknowledge(logId);
    setDetail(prev => prev ? { ...prev, has_acked: true } : prev);
    if (readStatus) {
      // optimistic: readStatus.has_acked는 재조회 시 갱신
      setReadStatus(null);
      setReadPanelOpen(false);
    }
  }, [logId, detail, readStatus]);

  const updateCardStatus = useCallback(async (cardId: number, status: string) => {
    setDetail(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        cards: prev.cards.map(c => c.id === cardId ? { ...c, status: status as any } : c),
      };
    });
    try {
      await cardApi.updateStatus(cardId, status);
    } catch {
      // 실패 시 재조회 (롤백)
      if (logId) {
        try {
          const res = await logApi.get(logId);
          setDetail(res.data.data ?? null);
        } catch {
          // 재조회도 실패 시 낙관적 업데이트 상태 유지
        }
      }
    }
  }, [logId]);

  return {
    detail, setDetail, isLoading, readStatus, readPanelOpen,
    toggleReadPanel, acknowledge, updateCardStatus,
  };
}
