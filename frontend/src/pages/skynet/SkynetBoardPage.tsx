import { useState } from 'react';
import { useSkynetBoard } from '../../hooks/skynet/useSkynetBoard';
import { useUIStore } from '../../store/uiStore';
import { formatDateTimeISO } from '../../utils/dateUtils';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { SearchIcon } from '../../components/icons';
import { SkynetBoardDetailModal } from '../../components/skynet/SkynetBoardDetailModal';
import type { SkynetBoardPost } from '../../types/skynet';

export function SkynetBoardPage() {
  const {
    q,
    setQ,
    activeQ,
    results,
    total,
    totalPages,
    page,
    pageSize,
    setPageSize,
    loading,
    stats,
    crawling,
    crawlMsg,
    search,
    clearSearch,
    goToPage,
    crawlNow,
    deletePosts,
  } = useSkynetBoard();

  const { addToast } = useUIStore();
  const [selectedPost, setSelectedPost] = useState<SkynetBoardPost | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') search();
  };
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="h-full bg-slate-100 dark:bg-slate-950 p-3 v2:bg-transparent v2:p-4 v2:dark:bg-transparent">
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden v2:rounded-md v2:border-[var(--v2-line)] v2:bg-[var(--v2-panel)]">
      <div className="shrink-0 px-6 pt-3 pb-2 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between gap-4 mb-2">
          <h1 className="text-[19px] font-bold text-slate-800 dark:text-white leading-none v2:sr-only">게시판</h1>
          <div className="flex items-center gap-3 flex-nowrap overflow-x-auto v2:ml-auto">
            {stats && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                마지막 수집: {stats.last_crawl_at ? formatDateTimeISO(stats.last_crawl_at) : '없음'}
              </span>
            )}
            {selectedIds.size > 0 && (
              <button
                onClick={() => setConfirmOpen(true)}
                disabled={deleting}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 text-[12px] hover:bg-red-200 dark:hover:bg-red-900/50 transition disabled:opacity-50"
              >
                {deleting ? <LoadingSpinner size={14} /> : null}
                {deleting ? '삭제 중...' : `삭제 (${selectedIds.size})`}
              </button>
            )}
            <button
              onClick={crawlNow}
              disabled={crawling}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-[12px] hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
            >
              {crawling ? <LoadingSpinner size={14} /> : null}
              지금 수집
            </button>
          </div>
        </div>

        {crawlMsg && (
          <div className="mb-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[12px]">
            {crawlMsg}
          </div>
        )}

        <div className="flex items-center gap-2 flex-nowrap overflow-x-auto pb-1">
          {stats && (<>
            {[
              { label: '게시글', value: stats.total.toLocaleString() },
              { label: '오늘', value: stats.today_count.toLocaleString() },
              { label: '키워드', value: stats.keyword_count.toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="shrink-0 flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg px-2.5 h-8 border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">{label}</span>
                <span className="text-[13px] font-bold text-slate-800 dark:text-white">{value}</span>
              </div>
            ))}
            <div className="shrink-0 w-px h-5 bg-slate-200 dark:bg-slate-700" />
          </>)}
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="예: 홍길동&2026&!제외어"
            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={search}
            disabled={loading}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-[14px] font-semibold transition disabled:opacity-50"
          >
            <SearchIcon size={16} /> 검색
          </button>
          {activeQ && (
            <button
              onClick={clearSearch}
              className="shrink-0 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              초기화
            </button>
          )}
          <span className="shrink-0 text-[11px] text-slate-400 whitespace-nowrap">
            <code>&amp;</code> AND · <code>!</code> 제외
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-3">
        <div className="text-[13px] text-slate-500 dark:text-slate-400 mb-2.5">
          {activeQ ? (
            <>
              <strong className="text-slate-700 dark:text-slate-200">"{activeQ}"</strong> 검색 결과
            </>
          ) : null}
          총 <span className="font-semibold text-slate-700 dark:text-slate-200">{total.toLocaleString()}</span>건
          <span className="ml-1 font-semibold text-slate-700 dark:text-slate-200">
            {total > 0 ? (page - 1) * pageSize + 1 : 0}~{Math.min(page * pageSize, total)}
          </span>
          건 표시
          {totalPages > 1 && <span className="ml-1 text-slate-400">({page}/{totalPages} 페이지)</span>}
        </div>

        {loading && results.length === 0 && (
          <div className="flex justify-center py-16"><LoadingSpinner size={32} /></div>
        )}
        {!loading && results.length === 0 && (
          <div className="flex flex-col items-center py-12 text-slate-400 dark:text-slate-500">
            <SearchIcon size={40} className="mb-3 opacity-40" />
            <p className="text-[14px]">게시글이 없습니다.</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="v2-table w-full border-collapse">
            <thead className="bg-slate-50 dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-700 sticky top-0">
              <tr>
                <th className="px-3 py-2 font-normal text-left text-[13px] text-slate-600 dark:text-slate-400 whitespace-nowrap w-[40px]">
                  <input
                    type="checkbox"
                    aria-label="모든 항목 선택"
                    title="모든 항목 선택"
                    checked={selectedIds.size > 0 && selectedIds.size === results.length}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(results.map(p => p.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    className="cursor-pointer rounded border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-2 font-normal text-left text-[13px] text-slate-600 dark:text-slate-400 whitespace-nowrap w-[56px]">번호</th>
                <th className="px-4 py-2 font-normal text-left text-[13px] text-slate-600 dark:text-slate-400 whitespace-nowrap">등록시각</th>
                <th className="px-4 py-2 font-normal text-left text-[13px] text-slate-600 dark:text-slate-400 whitespace-nowrap">게시판</th>
                <th className="px-4 py-2 font-normal text-left text-[13px] text-slate-600 dark:text-slate-400">제목</th>
                <th className="px-4 py-2 font-normal text-left text-[13px] text-slate-600 dark:text-slate-400 whitespace-nowrap">작성자</th>
                <th className="px-4 py-2 font-normal text-left text-[13px] text-slate-600 dark:text-slate-400 whitespace-nowrap">매칭 키워드</th>
              </tr>
            </thead>
            <tbody>
              {results.map((post, idx) => {
                const isNew = post.reg_dt?.slice(0, 10) === today;

                return (
                  <tr
                    key={post.id}
                    className={`border-b border-slate-100 dark:border-slate-800 transition ${selectedIds.has(post.id) ? 'bg-blue-100 dark:bg-blue-900/40' : 'hover:bg-blue-50 dark:hover:bg-slate-700'}`}
                  >
                    <td className="px-3 py-1.5 text-[13px]">
                      <input
                        type="checkbox"
                        aria-label={`${post.title} 선택`}
                        checked={selectedIds.has(post.id)}
                        onChange={e => {
                          e.stopPropagation();
                          const newIds = new Set(selectedIds);
                          if (e.target.checked) {
                            newIds.add(post.id);
                          } else {
                            newIds.delete(post.id);
                          }
                          setSelectedIds(newIds);
                        }}
                        className="cursor-pointer rounded border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td
                      onClick={() => setSelectedPost(post)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedPost(post);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className="px-4 py-1.5 text-[13px] text-slate-400 dark:text-slate-500 whitespace-nowrap cursor-pointer"
                    >
                      {total - (page - 1) * pageSize - idx}
                    </td>
                    <td
                      onClick={() => setSelectedPost(post)}
                      className="px-4 py-1.5 text-[13px] text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer"
                    >
                      {post.reg_dt ? formatDateTimeISO(post.reg_dt) : '-'}
                    </td>
                    <td
                      onClick={() => setSelectedPost(post)}
                      className="px-4 py-1.5 text-[13px] text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer"
                    >
                      {post.brd_name || '-'}
                    </td>
                    <td
                      onClick={() => setSelectedPost(post)}
                      className="px-4 py-1.5 max-w-[440px] cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        {isNew && (
                          <span className="shrink-0 px-1.5 py-0.5 rounded text-[11px] font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
                            NEW
                          </span>
                        )}
                        <span className="text-[13px] text-blue-700 dark:text-blue-400 hover:underline text-left line-clamp-1">
                          {post.title || '(제목 없음)'}
                        </span>
                      </div>
                    </td>
                    <td
                      onClick={() => setSelectedPost(post)}
                      className="px-4 py-1.5 text-[13px] text-slate-700 dark:text-slate-300 whitespace-nowrap cursor-pointer"
                    >
                      {post.author || '-'}
                    </td>
                    <td
                      onClick={() => setSelectedPost(post)}
                      className="px-4 py-1.5 cursor-pointer"
                    >
                      {post.matched_keyword ? (
                        <span className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                          {post.matched_keyword}
                        </span>
                      ) : (
                        <span className="text-[13px] text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      <div className="shrink-0 px-6 py-2 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <button onClick={() => { setSelectedIds(new Set()); goToPage(1); }} disabled={page <= 1} className="px-2 py-1 rounded text-[13px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">«</button>
            <button onClick={() => { setSelectedIds(new Set()); goToPage(page - 1); }} disabled={page <= 1} className="px-2 py-1 rounded text-[13px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">‹</button>
            {Array.from({ length: Math.min(9, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 4, totalPages - 8)) + i;
              return (
                <button key={p} onClick={() => { setSelectedIds(new Set()); goToPage(p); }}
                  className={`px-3 py-1 rounded text-[13px] transition ${p === page ? 'bg-blue-700 text-white font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => { setSelectedIds(new Set()); goToPage(page + 1); }} disabled={page >= totalPages} className="px-2 py-1 rounded text-[13px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">›</button>
            <button onClick={() => { setSelectedIds(new Set()); goToPage(totalPages); }} disabled={page >= totalPages} className="px-2 py-1 rounded text-[13px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">»</button>
          </div>
          <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}
            className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[12px] focus:outline-none">
            {[10, 20, 30, 50, 100].map(n => <option key={n} value={n}>{n}건</option>)}
          </select>
        </div>
      </div>

      {selectedPost && (
        <SkynetBoardDetailModal
          post={selectedPost}
          directUrl={
            stats?.board_direct_url && selectedPost.atcl_id
              ? `${stats.board_direct_url}&atclId=${selectedPost.atcl_id}`
              : null
          }
          onClose={() => setSelectedPost(null)}
        />
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="게시글 삭제"
        message={`${selectedIds.size}개 항목을 삭제하시겠습니까?\n\n삭제된 항목은 복구할 수 없습니다.`}
        confirmLabel="삭제"
        danger
        onConfirm={async () => {
          setConfirmOpen(false);
          setDeleting(true);
          const result = await deletePosts(Array.from(selectedIds));
          setDeleting(false);
          if (result.success) {
            setSelectedIds(new Set());
            addToast('삭제되었습니다', 'success');
          } else {
            addToast(result.message || '삭제 실패', 'error');
          }
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
    </div>
  );
}
