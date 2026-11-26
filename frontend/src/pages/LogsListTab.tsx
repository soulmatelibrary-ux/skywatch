import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LogRow } from '../components/logs/LogRow';
import { LogWriteModal } from '../components/logs/LogWriteModal';
import { LogDetailModal } from '../components/logs/LogDetailModal';
import { AttachSearchModal } from '../components/logs/AttachSearchModal';
import { SearchIcon } from '../components/icons';
import { useLogsList } from '../hooks/useLogsList';
import { useCategories } from '../hooks/useCategories';
import { readerFeatures } from '../utils/popupGeometry';

const TABLE_HEADERS = ['일자 및 근무','작성자 및 부서','일지 요약 및 키워드','일지 현황','상태','최종 수정','진행중'];
const CENTER_COLS = new Set(['일지 현황','상태','최종 수정','진행중']);

export function LogsListTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') ?? '';
  const openLogIdParam = searchParams.get('openLogId') ?? '';
  const isSearchMode = !!searchQuery;

  const useListHook = useLogsList();
  const { logs, pagination, isLoading, error, filter, markAsRead, setPage, setPerPage, reload, setTeam, setCategoryId, hideNotice, setHideNotice, newNoticeIds } = useListHook;

  const { categories } = useCategories();

  const [localQuery, setLocalQuery] = useState(searchQuery ?? '');

  const [viewLogId, setViewLogId] = useState<number | null>(null);
  const [editLogId, setEditLogId] = useState<number | null>(null);
  const [attachSearchOpen, setAttachSearchOpen] = useState(false);
  const [pageSizeOpt, setPageSizeOpt] = useState('50');
  const [customSize, setCustomSize] = useState('');

  useEffect(() => {
    setLocalQuery(searchQuery ?? '');
  }, [searchQuery]);

  useEffect(() => {
    if (viewLogId === null && editLogId === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewLogId(null);
        setEditLogId(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [viewLogId, editLogId]);

  useEffect(() => {
    if (openLogIdParam) {
      const logId = parseInt(openLogIdParam, 10);
      if (logId > 0) {
        markAsRead(logId);
        setViewLogId(logId);
        setSearchParams(params => {
          const next = new URLSearchParams(params);
          next.delete('openLogId');
          return next;
        }, { replace: true });
      }
    }
  }, [openLogIdParam, markAsRead, setSearchParams]);

  function handleSearchSubmit(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      const trimmed = localQuery.trim();
      setSearchParams(trimmed ? { q: trimmed } : {});
    }
  }

  function handlePerPageChange(val: string) {
    setPageSizeOpt(val);
    if (val !== 'custom') setPerPage(Number(val));
  }

  function handleCustomSize() {
    const n = parseInt(customSize, 10);
    if (n > 0 && n <= 200) setPerPage(n);
  }

  function handleRowClick(log: { id: number }) {
    markAsRead(log.id);
    handleOpenPopup(log);
  }

  function handleOpenPopup(log: { id: number }) {
    const features = readerFeatures('popup_log_view', {
      width: 1240, height: 860,
      left: Math.round((screen.width - 1240) / 2),
      top: Math.round((screen.height - 860) / 2),
    });
    window.open(`/logs/view-popup?id=${log.id}`, `log_view_${log.id}`, features);
  }

  const total = pagination?.total ?? 0;
  const totalPages = pagination?.total_pages ?? 1;
  const currentPage = filter.page;

  return (
    <>
    {viewLogId !== null && (
      <LogDetailModal
        logId={viewLogId}
        onClose={() => { setViewLogId(null); if (!isSearchMode) reload?.(); }}
        onEdit={() => { setEditLogId(viewLogId); setViewLogId(null); }}
        onDeleted={() => { setViewLogId(null); reload?.(); }}
      />
    )}
    {editLogId !== null && (
      <LogWriteModal
        logId={editLogId}
        onClose={() => setEditLogId(null)}
        onSaved={() => { setEditLogId(null); reload?.(); }}
        onDeleted={() => { setEditLogId(null); reload?.(); }}
      />
    )}
    {attachSearchOpen && (
      <AttachSearchModal
        onClose={() => setAttachSearchOpen(false)}
        onSelectLog={(logId) => { markAsRead(logId); setViewLogId(logId); }}
      />
    )}
    <div className="h-full overflow-hidden flex flex-col px-6 pt-3 pb-4">
      {error && (
        <div className="mb-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-[13px] text-red-700 dark:text-red-400 shrink-0">
          {error}
        </div>
      )}

      <div className="text-[12px] text-slate-400 dark:text-slate-500 mb-1.5 shrink-0 flex items-center gap-2 v2:hidden">
        <span>총 <span className="font-medium text-slate-600 dark:text-slate-300">{total}</span>건</span>
        {isLoading && <span>로딩 중...</span>}
      </div>

      <div className="mb-3 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-[47rem]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <SearchIcon size={14} />
            </span>
            <input
              type="text"
              value={localQuery}
              onChange={e => setLocalQuery(e.target.value)}
              onKeyDown={handleSearchSubmit}
              placeholder="일지·카드·댓글 검색"
              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg pl-9 pr-8 py-2 text-[13px] bg-slate-50 dark:bg-[#0f172a] dark:text-slate-200 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400/20"
            />
            {isSearchMode && (
              <button
                onClick={() => { setLocalQuery(''); setSearchParams({}); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[16px] leading-none"
              >×</button>
            )}
          </div>
          <label className="text-[12px] font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">근무조</label>
          <select
            value={filter.team || ''}
            onChange={(e) => setTeam(e.target.value || undefined)}
            className="px-3 py-2 text-[13px] border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-[#0f172a] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">전체조</option>
            <option value="A">A조</option>
            <option value="B">B조</option>
            <option value="C">C조</option>
            <option value="D">D조</option>
            <option value="day">일근</option>
          </select>
          {categories.length > 0 && (
            <>
              <label className="text-[12px] font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">카드 분류</label>
              <select
                value={filter.category_id ?? ''}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
                className="px-3 py-2 text-[13px] border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-[#0f172a] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">전체 분류</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </>
          )}
          <label className="flex items-center gap-1.5 text-[12px] text-slate-600 dark:text-slate-400 cursor-pointer whitespace-nowrap select-none">
            <input
              type="checkbox"
              checked={hideNotice}
              onChange={e => setHideNotice(e.target.checked)}
              className="w-3.5 h-3.5 accent-red-500 cursor-pointer"
            />
            공지 숨기기
          </label>
        </div>
        {/* 새 화면: 총 건수를 검색 줄 오른쪽으로 (따로 한 줄을 쓰지 않게) */}
        <span className="ml-auto mr-3 hidden whitespace-nowrap text-[13px] text-slate-500 tabular-nums v2:inline dark:text-slate-400">
          총 <b className="text-slate-800 dark:text-slate-100">{total.toLocaleString()}</b>건{isLoading && ' · 불러오는 중'}
        </span>
        <button
          onClick={() => setAttachSearchOpen(true)}
          title="첨부파일명으로 검색"
          className="flex items-center gap-1.5 px-3 py-2 text-[13px] border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-[#0f172a] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
        >
          📎 첨부파일 검색
        </button>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e293b]">
        <table className="w-full text-[16px]">
          <thead className="bg-slate-50 dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-700 sticky top-0">
            <tr>
              {TABLE_HEADERS.map(h => (
                <th key={h} className={`px-5 py-4 font-semibold text-slate-600 dark:text-slate-400 text-[13px] v2:px-3 v2:py-2.5 v2:whitespace-nowrap v2:text-[var(--v2-muted)] ${CENTER_COLS.has(h) ? 'text-center' : 'text-left'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {logs.map(log => (
              <LogRow
                key={log.id}
                log={log}
                onClick={handleRowClick}
                onOpenPopup={handleOpenPopup}
                searchQuery={isSearchMode ? searchQuery : undefined}
                isNewNotice={newNoticeIds.has(log.id)}
              />
            ))}
            {!isLoading && !error && logs.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400 dark:text-slate-500">
                  <div className="text-3xl mb-2">📋</div>
                  <div className="text-[14px]">일지가 없습니다</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="shrink-0 pt-3 flex items-center justify-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(1)} disabled={currentPage === 1}
            className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">«</button>
          <button onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1}
            className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">‹</button>
          {Array.from({ length: Math.min(9, totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(currentPage - 4, totalPages - 8)) + i;
            return (
              <button key={p} onClick={() => setPage(p)}
                className={`rounded px-3 py-1 text-[13px] transition ${p === currentPage ? 'bg-blue-700 font-semibold text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                {p}
              </button>
            );
          })}
          <button onClick={() => setPage(currentPage + 1)} disabled={currentPage >= totalPages}
            className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">›</button>
          <button onClick={() => setPage(totalPages)} disabled={currentPage >= totalPages}
            className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">»</button>
        </div>
        <select value={pageSizeOpt} onChange={e => handlePerPageChange(e.target.value)}
          className="border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-[12px] focus:outline-none bg-white dark:bg-[#0f172a] dark:text-slate-200">
          {['50','100','150','200'].map(v => <option key={v} value={v}>{v}건</option>)}
          <option value="custom">직접입력</option>
        </select>
        {pageSizeOpt === 'custom' && (
          <input type="number" value={customSize} onChange={e => setCustomSize(e.target.value)}
            onBlur={handleCustomSize} onKeyDown={e => e.key === 'Enter' && handleCustomSize()}
            min="1" max="200" placeholder="건"
            className="w-20 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-[12px] focus:outline-none dark:bg-[#0f172a] dark:text-slate-200" />
        )}
      </div>
    </div>
    </>
  );
}
