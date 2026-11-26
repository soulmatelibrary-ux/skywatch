import type { IssueListItem, IssueStatus } from '../../types/issue';
import { IssueRow } from './IssueRow';

export const ISSUE_STATUSES: IssueStatus[] = ['진행중', '수정완료', '경고', '반환'];

export const STATUS_STYLE: Record<IssueStatus, { badge: string; border: string }> = {
  진행중: {
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    border: 'border-l-blue-400 dark:border-l-blue-500',
  },
  수정완료: {
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    border: 'border-l-emerald-400 dark:border-l-emerald-500',
  },
  경고: {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    border: 'border-l-amber-400 dark:border-l-amber-500',
  },
  반환: {
    badge: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    border: 'border-l-red-400 dark:border-l-red-500',
  },
};

interface Props {
  items: IssueListItem[];
  total: number;
  loading: boolean;
  selectedId: number | null;
  checkedIds: Set<number>;
  page: number;
  totalPages: number;
  onSelect: (id: number) => void;
  onNew: () => void;
  onCheck: (id: number, checked: boolean) => void;
  onCheckAll: (checked: boolean) => void;
  onPageChange: (page: number) => void;
  onBulkStatusChange: (status: IssueStatus) => void;
  onOpenPopup?: (id: number) => void;
  onStatusChange?: (id: number, status: IssueStatus) => void;
}

export function IssueTable({ items, total, loading, selectedId, checkedIds, page, totalPages, onSelect, onNew, onCheck, onCheckAll, onPageChange, onBulkStatusChange, onOpenPopup, onStatusChange }: Props) {
  const allChecked = items.length > 0 && items.every(i => checkedIds.has(i.id));
  const someChecked = !allChecked && items.some(i => checkedIds.has(i.id));

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allChecked}
            ref={el => { if (el) el.indeterminate = someChecked; }}
            onChange={e => onCheckAll(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 accent-blue-600 cursor-pointer"
          />
          <span className="text-[12px] text-slate-400 dark:text-slate-500">
            총 <b className="text-slate-600 dark:text-slate-300">{total}</b>건
          </span>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="text-[12px] px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition font-medium"
        >
          + 이슈 등록
        </button>
      </div>

      {checkedIds.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-800 shrink-0">
          <span className="text-[12px] font-medium text-blue-700 dark:text-blue-300">{checkedIds.size}건 선택</span>
          <span className="text-slate-300 dark:text-slate-600 text-[11px]">|</span>
          <span className="text-[12px] text-slate-500 dark:text-slate-400">일괄 변경:</span>
          {ISSUE_STATUSES.map(s => (
            <button key={s} type="button" onClick={() => onBulkStatusChange(s)}
              className={`text-[11px] font-bold px-2 py-0.5 rounded transition hover:opacity-80 ${STATUS_STYLE[s].badge}`}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
        {loading && (
          <div className="flex items-center justify-center h-32 text-slate-400 text-[13px]">로딩 중...</div>
        )}
        {!loading && items.length === 0 && (
          <div className="flex items-center justify-center h-32 text-slate-400 text-[13px]">검색 결과가 없습니다.</div>
        )}
        {!loading && items.map(item => (
          <IssueRow
            key={item.id}
            item={item}
            isSelected={selectedId === item.id}
            isChecked={checkedIds.has(item.id)}
            onSelect={onSelect}
            onCheck={onCheck}
            onOpenPopup={onOpenPopup}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="shrink-0 flex items-center justify-center gap-1 py-2.5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <button onClick={() => onPageChange(1)} disabled={page === 1}
            className="rounded px-2 py-1 text-[12px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">«</button>
          <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
            className="rounded px-2 py-1 text-[12px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">‹</button>
          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(page - 3, totalPages - 6)) + i;
            return (
              <button key={p} onClick={() => onPageChange(p)}
                className={`rounded px-2.5 py-1 text-[12px] transition ${p === page ? 'bg-blue-600 text-white font-semibold' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                {p}
              </button>
            );
          })}
          <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
            className="rounded px-2 py-1 text-[12px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">›</button>
          <button onClick={() => onPageChange(totalPages)} disabled={page >= totalPages}
            className="rounded px-2 py-1 text-[12px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">»</button>
        </div>
      )}
    </div>
  );
}
