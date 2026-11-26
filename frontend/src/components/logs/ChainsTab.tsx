import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { chainsApi } from '../../services/api/chainsApi';
import { LogsRefreshContext } from '../../context/LogsRefreshContext';
import type { ChainInfo } from '../../types/log';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export function ChainsTab() {
  const [chains, setChains] = useState<ChainInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { addToast } = useUIStore();

  const refreshKey = useContext(LogsRefreshContext);
  const mountedRefreshKey = useRef(refreshKey);

  function getDisplayStatus(chain: ChainInfo) {
    const isAllCompleted = chain.total_cards > 0 && chain.completed_cards === chain.total_cards;
    if (isAllCompleted) return { label: '완료', color: '#16a34a' };
    return {
      label: chain.recent_status_label || chain.recent_status_key || '진행중',
      color: chain.recent_status_color,
    };
  }

  async function loadChains() {
    setIsLoading(true);
    try {
      const response = await chainsApi.list();
      setChains(response.data.data ?? []);
    } catch {
      setChains([]);
      addToast('연결된 카드 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadChains();
  }, []);

  useEffect(() => {
    if (refreshKey === mountedRefreshKey.current) return;
    loadChains();
  }, [refreshKey]);

  const filteredChains = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chains;
    return chains.filter(chain => {
      const status = getDisplayStatus(chain).label.toLowerCase();
      const root = chain.root_card_title.toLowerCase();
      const logText = chain.logs
        .map(log => `${log.log_date} ${log.log_shift_type ?? ''} ${log.log_title ?? ''}`.toLowerCase())
        .join(' ');
      return root.includes(q) || status.includes(q) || logText.includes(q) || String(chain.total_cards).includes(q) || String(chain.completed_cards).includes(q);
    });
  }, [chains, query]);

  const totalPages = Math.max(1, Math.ceil(filteredChains.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageChains = filteredChains.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => { setPage(1); }, [query, pageSize]);
  useEffect(() => { if (page !== safePage) setPage(safePage); }, [safePage, page]);

  const isEmpty = !isLoading && filteredChains.length === 0;

  function openChainPopup(chain: ChainInfo) {
    const url = `/logs/chain-popup?cardId=${chain.root_card_id}&title=${encodeURIComponent(chain.root_card_title)}`;
    window.open(url, `chain_popup_${chain.root_card_id}`, 'popup,width=1100,height=760,left=200,top=100');
  }

  return (
    <div className="h-full overflow-hidden flex flex-col bg-white dark:bg-[#0f172a]">
      <div className="shrink-0 px-6 py-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">연결된 카드</h1>
            <p className="mt-1 text-[12px] text-slate-400 dark:text-slate-500">
              검색 후 페이지당 개수로 나눠서 봅니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="카드명, 일지, 상태 검색"
              className="min-w-[280px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="rounded-lg border border-slate-300 px-3 py-2 text-[13px] text-slate-500 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                초기화
              </button>
            )}
            <select
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-[13px] text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            >
              {PAGE_SIZE_OPTIONS.map(n => (
                <option key={n} value={n}>{n}개</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6">
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e293b]">
          <table className="w-full text-[16px]">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-[#0f172a] sticky top-0">
              <tr>
                <th className="px-5 py-4 text-left text-[13px] font-semibold text-slate-600 dark:text-slate-400">첫 카드</th>
                <th className="px-5 py-4 text-left text-[13px] font-semibold text-slate-600 dark:text-slate-400">포함된 일지</th>
                <th className="px-5 py-4 text-center text-[13px] font-semibold text-slate-600 dark:text-slate-400">카드 현황</th>
                <th className="px-5 py-4 text-center text-[13px] font-semibold text-slate-600 dark:text-slate-400">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {isLoading && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-400 dark:text-slate-500">
                    불러오는 중...
                  </td>
                </tr>
              )}
              {!isLoading && pageChains.map(chain => {
                const displayStatus = getDisplayStatus(chain);
                return (
                  <tr
                    key={chain.root_card_id}
                    onClick={() => openChainPopup(chain)}
                    className="cursor-pointer transition-colors duration-150 hover:bg-blue-50/40 dark:hover:bg-slate-800/40 group"
                  >
                    <td className="px-5 py-2.5">
                      <span className="line-clamp-1 text-[14px] font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {chain.root_card_title}
                      </span>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {chain.logs.map(log => (
                          <span
                            key={log.log_id}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                          >
                            {log.log_date} {log.log_shift_type ?? ''}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center justify-center gap-2">
                        <div className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800/50" title="전체 카드">
                          <span className="text-[12px]">📝</span>
                          <span className="text-[12px] font-bold">{chain.total_cards}</span>
                        </div>
                        <div className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800/50" title="완료 카드">
                          <span className="text-[12px]">✅</span>
                          <span className="text-[12px] font-bold">{chain.completed_cards}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                        style={
                          displayStatus.color
                            ? { backgroundColor: `${displayStatus.color}22`, color: displayStatus.color }
                            : { backgroundColor: '#f1f5f9', color: '#64748b' }
                        }
                      >
                        {displayStatus.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {isEmpty && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-slate-400 dark:text-slate-500">
                    연결된 카드 체인이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!isLoading && filteredChains.length > 0 && (
        <div className="shrink-0 px-6 py-3 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-center gap-1">
            <button onClick={() => setPage(1)} disabled={safePage <= 1}
              className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">«</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}
              className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">‹</button>
            {Array.from({ length: Math.min(9, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(safePage - 4, totalPages - 8));
              const p = start + i;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`rounded px-3 py-1 text-[13px] transition ${p === safePage ? 'bg-blue-700 font-semibold text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
              className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">›</button>
            <button onClick={() => setPage(totalPages)} disabled={safePage >= totalPages}
              className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">»</button>
          </div>
        </div>
      )}
    </div>
  );
}
