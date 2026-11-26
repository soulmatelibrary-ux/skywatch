import { useEffect, useState } from 'react';
import type { IssueListItem, IssueStatus } from '../../types/issue';
import { STATUS_STYLE, ISSUE_STATUSES } from './IssueTable';

interface Props {
  item: IssueListItem;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: (id: number) => void;
  onCheck: (id: number, checked: boolean) => void;
  onOpenPopup?: (id: number) => void;
  onStatusChange?: (id: number, status: IssueStatus) => void;
}

export function IssueRow({ item, isSelected, isChecked, onSelect, onCheck, onOpenPopup, onStatusChange }: Props) {
  const [pendingStatus, setPendingStatus] = useState<IssueStatus | null>(null);

  useEffect(() => { setPendingStatus(null); }, [item.status]);

  const displayStatus = pendingStatus ?? item.status;
  const style = STATUS_STYLE[displayStatus] ?? STATUS_STYLE['진행중'];
  const creatorName = item.created_by_name?.trim() || '관리자';

  return (
    <div
      className={`relative group border-l-[3px] transition-colors ${style.border} ${
        isSelected
          ? 'bg-slate-100 dark:bg-slate-800'
          : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70'
      }`}
    >
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <input
          type="checkbox"
          checked={isChecked}
          onChange={e => onCheck(item.id, e.target.checked)}
          onClick={e => e.stopPropagation()}
          className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-slate-300 accent-blue-600 dark:border-slate-600"
        />
        <select
          value={displayStatus}
          onChange={e => {
            const next = e.target.value as IssueStatus;
            setPendingStatus(next);
            onStatusChange?.(item.id, next);
          }}
          onClick={e => e.stopPropagation()}
          className={`cursor-pointer rounded border-0 px-1.5 py-0.5 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:[color-scheme:dark] ${style.badge}`}
        >
          {ISSUE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {item.kac_pr_no && (
          <span className="shrink-0 font-mono text-[12px] font-semibold text-slate-600 dark:text-slate-300">
            {item.kac_pr_no}
          </span>
        )}
        {item.lm_pr_no && (
          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            {item.lm_pr_no}
          </span>
        )}
        <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
          {item.reg_date}
        </span>
      </div>

      <button type="button" onClick={() => onSelect(item.id)} className="w-full px-4 pb-3 text-left">
        <div className="mb-1.5 line-clamp-2 text-[13px] font-semibold leading-snug text-slate-800 dark:text-slate-100">
          {item.title}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(item.version || item.mod_version) && (
            <div className="flex shrink-0 items-center gap-1">
              {item.version && (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {item.version}
                </span>
              )}
              {item.version && item.mod_version && <span className="text-[11px] text-slate-300 dark:text-slate-600">/</span>}
              {item.mod_version && (
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-[11px] text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                  {item.mod_version}
                </span>
              )}
            </div>
          )}
          {item.action_date && item.action_date !== item.reg_date && (
            <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">조치 {item.action_date}</span>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <span className="text-slate-400">작성자</span>
              <b className="font-semibold text-slate-700 dark:text-slate-200">{creatorName}</b>
            </span>
            {item.comment_count > 0 && <span>댓글 {item.comment_count}</span>}
            {item.attachment_count > 0 && <span>첨부 {item.attachment_count}</span>}
            {item.assigned_to_name && <span className="font-medium text-slate-500 dark:text-slate-400">{item.assigned_to_name}</span>}
          </div>
        </div>
      </button>

      {onOpenPopup && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onOpenPopup(item.id);
          }}
          title="팝업으로 열기"
          className="absolute right-2 top-2 rounded p-1 text-slate-400 opacity-0 transition-opacity hover:text-blue-500 group-hover:opacity-100 dark:text-slate-500 dark:hover:text-blue-400"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </button>
      )}
    </div>
  );
}
