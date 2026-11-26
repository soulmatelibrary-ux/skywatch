// 문서 목록 — 제목이 먼저 보이는 줄 목록. 왼쪽 띠 색 = 분류
import type { CategoryTree, TechDocListItem } from '../../types/techDoc';
import { PageNav } from '../common/PageNav';

const CAT_COLORS = [
  'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-violet-500', 'bg-teal-500', 'bg-orange-500', 'bg-indigo-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-lime-500', 'bg-blue-500',
];

function catColor(code: string): string {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) & 0xffff;
  return CAT_COLORS[h % CAT_COLORS.length];
}

interface Props {
  items: TechDocListItem[];
  total: number;
  page: number;
  pageSize: number;
  selectedId: number | null;
  selectedIds: Set<number>;
  isLoading: boolean;
  categories: CategoryTree[];
  onSelectDoc: (id: number) => void;
  onToggleSelect: (id: number) => void;
  onSelectAll: (ids: number[]) => void;
  onPageChange: (page: number) => void;
}

export function TechDocTable({
  items, total, page, pageSize, selectedId, selectedIds, isLoading, categories,
  onSelectDoc, onToggleSelect, onSelectAll, onPageChange,
}: Props) {
  const catNameMap = new Map<string, string>();
  for (const tree of categories) for (const cat of tree.categories) catNameMap.set(cat.category_code, cat.name);

  if (isLoading) return <div className="flex h-full items-center justify-center text-[13px] text-slate-400">불러오는 중…</div>;
  if (!items.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
        <p className="text-[14px] font-semibold text-slate-600 dark:text-slate-300">이 분류에 문서가 없습니다.</p>
        <p className="text-[12px] text-slate-400">다른 분류를 고르거나 검색 조건을 지워 보세요.</p>
      </div>
    );
  }

  const pageIds = items.map(i => i.id);
  const allChecked = pageIds.every(id => selectedIds.has(id));
  const someChecked = !allChecked && pageIds.some(id => selectedIds.has(id));

  return (
    <div className="flex h-full flex-col">
      <label className="flex shrink-0 cursor-pointer items-center gap-2 border-b border-slate-200 px-3 py-1.5 text-[12px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <input type="checkbox" checked={allChecked} ref={el => { if (el) el.indeterminate = someChecked; }}
          onChange={() => onSelectAll(pageIds)} className="accent-sky-600" />
        이 쪽 전체 선택 <span className="text-slate-400">(분류 이동용)</span>
      </label>
      <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
        {items.map(item => {
          const active = item.id === selectedId;
          const checked = selectedIds.has(item.id);
          const cat = (item.category_code && catNameMap.get(item.category_code)) || item.doc_type || '';
          return (
            <li key={item.id} className={`flex items-stretch ${active ? 'bg-sky-50 dark:bg-sky-950/40' : checked ? 'bg-amber-50/60 dark:bg-amber-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
              <span className={`w-1 shrink-0 ${item.category_code ? catColor(item.category_code) : 'bg-slate-300 dark:bg-slate-600'}`} aria-hidden />
              <label className="flex shrink-0 cursor-pointer items-start px-2.5 pt-3" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={checked} onChange={() => onToggleSelect(item.id)} aria-label={`${item.title} 선택`} className="accent-sky-600" />
              </label>
              <button type="button" onClick={() => onSelectDoc(item.id)}
                className="min-w-0 flex-1 py-2 pr-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400">
                <span className={`line-clamp-2 text-[14px] font-semibold leading-snug ${active ? 'text-sky-800 dark:text-sky-200' : 'text-slate-800 dark:text-slate-100'}`}>
                  {item.title || '(제목 없음)'}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-slate-500 dark:text-slate-400">
                  <span className="tabular-nums">{item.record_date ? item.record_date.slice(0, 10) : '-'}</span>
                  <span>{item.author_name || '관리자'}</span>
                  {cat && <span className="truncate">{cat}</span>}
                  {item.attachment_count > 0 && <span className="text-sky-700 dark:text-sky-300">첨부 {item.attachment_count}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <PageNav page={page} total={total} pageSize={pageSize} onPageChange={onPageChange} />
    </div>
  );
}
