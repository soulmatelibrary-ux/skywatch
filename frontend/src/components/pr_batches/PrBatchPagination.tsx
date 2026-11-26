interface Props {
  total: number;
  limit: number;
  skip: number;
  onChange: (skip: number) => void;
}

export function PrBatchPagination({ total, limit, skip, onChange }: Props) {
  if (total <= limit) return null;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(skip / limit) + 1;
  const pages: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('…');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }

  return <div className="flex justify-center items-center gap-1 pt-2">
    <button disabled={skip === 0} onClick={() => onChange(Math.max(0, skip - limit))} className="text-[12px] px-2.5 py-1 border rounded disabled:opacity-30">이전</button>
    {pages.map((page, i) => page === '…'
      ? <span key={`ellipsis-${i}`} className="px-1.5 text-[12px] text-slate-400">…</span>
      : <button key={page} onClick={() => onChange((page - 1) * limit)}
        className={`min-w-[26px] px-1.5 py-1 rounded text-[12px] ${page === currentPage ? 'bg-sky-600 text-white font-bold' : 'text-slate-600 hover:bg-slate-100'}`}>
        {page}
      </button>)}
    <button disabled={skip + limit >= total} onClick={() => onChange(skip + limit)} className="text-[12px] px-2.5 py-1 border rounded disabled:opacity-30">다음</button>
    <span className="ml-1.5 text-[11px] text-slate-400">{currentPage}/{totalPages} 페이지</span>
  </div>;
}
