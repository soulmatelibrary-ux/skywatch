import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useBoardPage } from '../../hooks/useBoardPage';
import { LogWriteModal } from './LogWriteModal';
import { BoardCardItem } from '../board/BoardCardItem';
import { useCardStatuses } from '../../hooks/useCardStatuses';
import { boardApi } from '../../services/api/boardApi';
import { LogsRefreshContext } from '../../context/LogsRefreshContext';

const TEAMS = [
  { value: '', label: '전체' },
  { value: 'A', label: 'A조' },
  { value: 'B', label: 'B조' },
  { value: 'C', label: 'C조' },
  { value: 'D', label: 'D조' },
  { value: 'day', label: '일근' },
];

export function BoardTab() {
  const {
    categories,
    collapsed,
    isLoading,
    loadError,
    filters,
    setFilters,
    toggleCollapse,
    updateCardStatus,
    resetFilters,
    reload,
  } = useBoardPage();

  const refreshKey = useContext(LogsRefreshContext);
  const mountedRefreshKey = useRef(refreshKey);

  useEffect(() => {
    if (refreshKey === mountedRefreshKey.current) return;
    reload();
  }, [refreshKey]);

  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const statuses = useCardStatuses();
  const colCount = categories.length >= 6 ? 3 : 2;

  const visibleCardIds = useMemo(
    () => new Set(categories.flatMap(cat => cat.cards.map(card => card.id))),
    [categories],
  );
  const selectedCount = selectedCardIds.size;

  const toggleSelect = (cardId: number) => {
    setSelectedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const clearSelection = () => setSelectedCardIds(new Set());

  const handleResetFilters = () => {
    resetFilters();
    clearSelection();
  };

  const handleDeleteSelected = async () => {
    const ids = [...selectedCardIds].filter(id => visibleCardIds.has(id));
    if (ids.length === 0) return;
    if (!window.confirm(`선택한 ${ids.length}개 카드를 삭제하시겠습니까?`)) return;

    setDeleting(true);
    try {
      await Promise.all(ids.map(id => boardApi.deleteCard(id)));
      clearSelection();
      await reload();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 border-b border-slate-200 bg-white px-8 py-3 dark:border-slate-700 dark:bg-[#1e293b]">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={filters.team}
            onChange={e => setFilters(f => ({ ...f, team: e.target.value }))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-600 dark:bg-[#0f172a] dark:text-slate-200"
          >
            {TEAMS.map(t => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={filters.dateFrom}
            onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-600 dark:bg-[#0f172a] dark:text-slate-200"
          />
          <span className="text-slate-400 dark:text-slate-500">~</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-600 dark:bg-[#0f172a] dark:text-slate-200"
          />

          <button
            onClick={handleResetFilters}
            className="ml-auto rounded-lg border border-slate-200 px-4 py-2 text-[13px] text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            초기화
          </button>

          {selectedCount > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-[13px] font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
            >
              {deleting ? '삭제 중...' : `선택 삭제 (${selectedCount})`}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-[14px] text-slate-400">
            불러오는 중...
          </div>
        ) : loadError ? (
          <div className="flex h-40 items-center justify-center text-[14px] text-red-400">
            데이터를 불러오지 못했습니다. 다시 시도해 주세요.
          </div>
        ) : categories.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-slate-300">
            <p className="text-[15px]">진행중인 미완료 카드가 없습니다</p>
          </div>
        ) : (
          <div style={{ columnCount: colCount, columnGap: '16px' }}>
            {categories.map(cat => {
              const isCollapsed = collapsed.has(cat.id);
              return (
                <div
                  key={cat.id}
                  className="mb-4 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-[#0f172a]"
                  style={{
                    breakInside: 'avoid',
                    height: isCollapsed ? 'auto' : '420px',
                    minHeight: isCollapsed ? undefined : '360px',
                  }}
                >
                  <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-[#1e293b]">
                    <div
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: cat.color ?? '#94a3b8' }}
                    />
                    <span className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">{cat.name}</span>
                    <span className="ml-auto rounded bg-slate-100 px-2 py-0.5 text-[12px] font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                      {cat.count}
                    </span>
                    <button
                      onClick={() => toggleCollapse(cat.id)}
                      className="rounded-md border border-slate-300 px-2 py-0.5 text-[11px] text-slate-500 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                    >
                      {isCollapsed ? '펼치기' : '접기'}
                    </button>
                  </div>

                  {!isCollapsed && (
                    <div className="flex-1 space-y-2 overflow-y-auto p-3">
                      {cat.cards.length === 0 ? (
                        <div className="py-8 text-center text-[12px] text-slate-300">
                          진행중인 미완료 카드가 없습니다
                        </div>
                      ) : (
                        cat.cards.map(card => (
                          <BoardCardItem
                            key={card.id}
                            card={card}
                            statuses={statuses}
                            onOpen={() => setSelectedLogId(card.log_id)}
                            onStatusChange={updateCardStatus}
                            selected={selectedCardIds.has(card.id)}
                            onToggleSelect={toggleSelect}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedLogId !== null && (
        <LogWriteModal
          logId={selectedLogId}
          onClose={() => setSelectedLogId(null)}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}
