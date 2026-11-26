// SkyNet 문서 목록 페이지네이션 + 페이지당 건수 선택 컴포넌트
interface Props {
  page: number;
  totalPages: number;
  pageSize: number;
  goToPage: (p: number) => void;
  setPageSize: (n: number) => void;
}

export const SkynetPagination = ({ page, totalPages, pageSize, goToPage, setPageSize }: Props) => (
  <div className="flex items-center justify-center gap-3 flex-wrap">
    <div className="flex items-center gap-1">
      <button onClick={() => goToPage(1)} disabled={page <= 1} className="px-2 py-1 rounded text-[13px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">«</button>
      <button onClick={() => goToPage(page - 1)} disabled={page <= 1} className="px-2 py-1 rounded text-[13px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">‹</button>
      {Array.from({ length: Math.min(9, totalPages) }, (_, i) => {
        const p = Math.max(1, Math.min(page - 4, totalPages - 8)) + i;
        return (
          <button key={p} onClick={() => goToPage(p)}
            className={`px-3 py-1 rounded text-[13px] transition ${p === page ? 'bg-blue-700 text-white font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
            {p}
          </button>
        );
      })}
      <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages} className="px-2 py-1 rounded text-[13px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">›</button>
      <button onClick={() => goToPage(totalPages)} disabled={page >= totalPages} className="px-2 py-1 rounded text-[13px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">»</button>
    </div>
    <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}
      className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[12px] focus:outline-none">
      {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}건</option>)}
    </select>
  </div>
);
