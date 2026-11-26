// 목록 쪽 이동 (관제시스템 문서·문의사항 공용)
interface Props {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** 목록 아래 구분선 (패널 안에 붙일 때) */
  bordered?: boolean;
}

function pageList(page: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (page > 3) pages.push('...');
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
  if (page < totalPages - 2) pages.push('...');
  pages.push(totalPages);
  return pages;
}

const BTN = 'min-w-[26px] rounded-md px-1.5 py-0.5 text-[12px] tabular-nums transition disabled:opacity-40';

export function PageNav({ page, total, pageSize, onPageChange, bordered = true }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= 0) return null;
  return (
    <nav aria-label="쪽 이동" className={`flex shrink-0 items-center justify-center gap-1 py-2 ${bordered ? 'border-t border-slate-200 dark:border-slate-800' : ''}`}>
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}
        className={`${BTN} text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800`}>이전</button>
      {pageList(page, totalPages).map((p, i) => p === '...'
        ? <span key={`e${i}`} className="px-1 text-[12px] text-slate-400">…</span>
        : (
          <button key={p} type="button" onClick={() => onPageChange(p)} aria-current={p === page ? 'page' : undefined}
            className={`${BTN} ${p === page ? 'bg-sky-600 font-semibold text-white dark:bg-sky-500 dark:text-slate-950' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
            {p}
          </button>
        ))}
      <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}
        className={`${BTN} text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800`}>다음</button>
    </nav>
  );
}
