import { useCallback, useEffect, useRef, useState } from 'react';
import { boardApi } from '../services/api/boardApi';
import type { BoardCategory } from '../types/log';

interface BoardFilters {
  team: string;
  dateFrom: string;
  dateTo: string;
}

export function useBoardPage() {
  const [categories, setCategories] = useState<BoardCategory[]>([]);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [filters, setFilters] = useState<BoardFilters>({ team: '', dateFrom: oneMonthAgo, dateTo: today });

  // 사용자가 수동으로 토글한 카테고리 기록 (true=접힘, false=펼침)
  const userToggles = useRef<Map<number, boolean>>(new Map());

  const load = useCallback(async (f: BoardFilters) => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const params: Record<string, string> = {};
      if (f.team) params.team = f.team;
      if (f.dateFrom) params.date_from = f.dateFrom;
      if (f.dateTo) params.date_to = f.dateTo;
      const r = await boardApi.get(params);
      const data = r.data.data ?? [];
      setCategories(data);
      // 0건 카테고리 자동 접기 후 수동 토글 이력 반영
      const autoCollapsed = new Set(data.filter(c => c.count === 0).map(c => c.id));
      for (const [id, shouldCollapse] of userToggles.current) {
        if (shouldCollapse) autoCollapsed.add(id);
        else autoCollapsed.delete(id);
      }
      setCollapsed(autoCollapsed);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(filters); }, [load, filters]);

  const resetFilters = () => setFilters({ team: '', dateFrom: oneMonthAgo, dateTo: today });

  const toggleCollapse = (id: number) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      const willCollapse = !prev.has(id);
      willCollapse ? next.add(id) : next.delete(id);
      userToggles.current.set(id, willCollapse);
      return next;
    });
  };

  const updateCardStatus = async (cardId: number, status: string) => {
    // 낙관적 업데이트: done이면 즉시 제거, 그 외엔 상태만 변경
    setCategories(prev => prev.map(cat => {
      const updatedCards = status === 'done'
        ? cat.cards.filter(c => c.id !== cardId)
        : cat.cards.map(c => c.id === cardId ? { ...c, status: status as any } : c);
      return { ...cat, cards: updatedCards, count: updatedCards.length };
    }));

    try {
      await boardApi.updateCardStatus(cardId, status);
    } catch {
      load(filters);
    }
  };

  return {
    categories, collapsed, isLoading, loadError, filters, setFilters,
    toggleCollapse, updateCardStatus, resetFilters, reload: () => load(filters),
  };
}
