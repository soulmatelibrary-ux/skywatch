// 검색 결과 — 운항 스트립처럼 한 줄씩: 왼쪽 띠(자료 종류) · 날짜/작성자 · 제목과 일치한 내용
import type { UnifiedSearchItem } from '../../types/search';
import { TYPE_META, highlight } from './searchMeta';

interface Props {
  items: UnifiedSearchItem[];
  query: string;
  startIndex: number;
  onOpen: (item: UnifiedSearchItem) => void;
}

function ResultRow({ item, query, onOpen }: { item: UnifiedSearchItem; query: string; onOpen: Props['onOpen'] }) {
  const meta = TYPE_META[item.target_type] ?? { label: item.target_type, edge: 'bg-slate-400', text: 'text-slate-600' };
  const date = (item.work_date ?? item.updated_at ?? '').slice(0, 10) || '-';
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(item)}
        className="group flex w-full items-stretch text-left transition hover:bg-sky-50/70 focus-visible:bg-sky-50 focus-visible:outline-none dark:hover:bg-slate-800/70 dark:focus-visible:bg-slate-800"
      >
        <span className={`w-1 shrink-0 ${meta.edge}`} aria-hidden />
        <span className="hidden w-28 shrink-0 flex-col border-r border-slate-100 px-3 py-3 sm:flex dark:border-slate-800">
          <span className="text-[13px] font-semibold tabular-nums text-slate-700 dark:text-slate-200">{date}</span>
          <span className="truncate text-[12px] text-slate-400 dark:text-slate-500">{item.author || '관리자'}</span>
        </span>
        <span className="min-w-0 flex-1 px-4 py-2.5">
          <span className="flex items-center gap-2 text-[12px]">
            <span className={`shrink-0 whitespace-nowrap font-semibold ${meta.text}`}>{meta.label}</span>
            {item.category && <span className="truncate text-slate-400 dark:text-slate-500">{item.category}</span>}
            <span className="text-slate-400 sm:hidden">{date}</span>
            {(item.attach_count ?? 0) > 0 && <span className="text-slate-400 dark:text-slate-500">첨부 {item.attach_count}</span>}
          </span>
          <span className="block truncate text-[15px] font-semibold text-slate-900 group-hover:text-sky-800 dark:text-slate-100 dark:group-hover:text-sky-200">
            {highlight(item.title, query)}
          </span>
          {item.snippet && (
            <span className="mt-0.5 line-clamp-2 max-w-[80ch] text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
              {highlight(item.snippet, query)}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

export function SearchResultList({ items, query, startIndex, onOpen }: Props) {
  return (
    <ol start={startIndex + 1} className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-700/80 dark:bg-slate-900">
      {items.map(item => (
        <ResultRow key={`${item.target_type}-${item.target_id}`} item={item} query={query} onOpen={onOpen} />
      ))}
    </ol>
  );
}

export function SearchPager({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  if (total <= 1) return null;
  const btn = 'rounded-lg border border-slate-300 px-3 py-1 text-[13px] text-slate-600 transition hover:border-sky-500 hover:text-sky-700 disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:text-slate-600 dark:border-slate-700 dark:text-slate-300';
  return (
    <div className="flex items-center justify-center gap-3 py-3">
      <button type="button" className={btn} disabled={page === 1} onClick={() => onPage(page - 1)}>이전</button>
      <span className="text-[13px] tabular-nums text-slate-500 dark:text-slate-400">{page} / {total}</span>
      <button type="button" className={btn} disabled={page === total} onClick={() => onPage(page + 1)}>다음</button>
    </div>
  );
}
