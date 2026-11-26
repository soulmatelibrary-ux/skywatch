import { useState } from 'react';
import type { Pagination } from '../../types';
import type { Notification, NotifFilter, NotifSummary } from '../../types/notification';
import { NotificationItem } from './NotificationItem';

function buildSummary(notifs: Notification[]): NotifSummary {
  return {
    total: notifs.length,
    unread: notifs.filter(n => !n.read_at).length,
    needCheck: 0,
    mentions: notifs.filter(n => n.type === 'mention').length,
    cardChanges: notifs.filter(n => n.type === 'card').length,
    tasks: notifs.filter(n => n.type === 'comment').length,
  };
}

interface Props {
  notifications: Notification[];
  pagination: Pagination | null;
  page: number;
  searchInput: string;
  onSearchChange: (v: string) => void;
  onSearch: () => void;
  onPageChange: (p: number) => void;
  onRead: (id: number) => void;
  onOpen?: (notif: Notification) => void;
  onPreviewLog?: (notif: Notification) => void;
  onDelete?: (id: number) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
}

export function NotificationCenter({
  notifications,
  pagination,
  page,
  searchInput,
  onSearchChange,
  onSearch,
  onPageChange,
  onRead,
  onOpen,
  onPreviewLog,
  onDelete,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: Props) {
  const [filter, setFilter] = useState<NotifFilter>('all');
  const summary = buildSummary(notifications);

  const filtered = notifications.filter(n => {
    if (filter === 'unread' && n.read_at) return false;
    if (filter === 'mention' && n.type !== 'mention') return false;
    if (filter === 'card' && n.type !== 'card') return false;
    if (filter === 'comment' && n.type !== 'comment') return false;
    return true;
  });

  const FILTER_BTNS: { key: NotifFilter; label: string; activeClass: string }[] = [
    { key: 'all', label: '전체', activeClass: 'bg-slate-900 text-white border-slate-900 dark:bg-blue-500 dark:text-white dark:border-blue-500' },
    { key: 'unread', label: '미확인', activeClass: 'bg-blue-600 text-white border-blue-600' },
    { key: 'mention', label: '멘션', activeClass: 'bg-emerald-600 text-white border-emerald-600' },
    { key: 'comment', label: '댓글', activeClass: 'bg-cyan-600 text-white border-cyan-600' },
    { key: 'card', label: '카드 변경', activeClass: 'bg-indigo-600 text-white border-indigo-600' },
  ];

  return (
    <div className="flex flex-col gap-4 min-h-0">
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">전체</p>
          <p className="text-[22px] font-bold text-slate-900 dark:text-slate-50">{pagination?.total ?? summary.total}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 shadow-sm dark:border-blue-500/30 dark:bg-blue-500/10">
          <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-300">미확인</p>
          <p className="text-[22px] font-bold text-blue-800 dark:text-blue-200">{summary.unread}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">멘션</p>
          <p className="text-[22px] font-bold text-emerald-800 dark:text-emerald-200">{summary.mentions}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 shadow-sm dark:border-indigo-500/30 dark:bg-indigo-500/10">
          <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">카드 변경</p>
          <p className="text-[22px] font-bold text-indigo-800 dark:text-indigo-200">{summary.cardChanges}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
        <div className="flex flex-wrap items-center gap-2">
          {FILTER_BTNS.map(btn => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition ${
                filter === btn.key
                  ? btn.activeClass
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {btn.label}
            </button>
          ))}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-slate-500 dark:text-slate-400 shrink-0">기간</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => onDateFromChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSearch()}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            />
            <span className="text-[12px] text-slate-400 dark:text-slate-500">~</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => onDateToChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSearch()}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[13px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100"
            />
            <input
              type="text"
              value={searchInput}
              onChange={e => onSearchChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSearch()}
              placeholder="알림 내용 검색..."
              className="w-44 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            <button
              onClick={onSearch}
              className="rounded-lg border border-blue-700 bg-blue-700 px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-blue-800 dark:border-blue-500 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-400"
            >
              검색
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-700">
          <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">알림 목록</p>
          <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
            {filtered.length}건(전체 {pagination?.total ?? filtered.length}건)
          </p>
        </div>

        <div className="max-h-[58vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-slate-500 dark:text-slate-400">
              해당 조건의 알림이 없습니다.
            </div>
          ) : (
            filtered.map(n => (
              <NotificationItem
                key={n.id}
                notif={n}
                showBadge
                onRead={onRead}
                onOpen={onOpen}
                onPreviewLog={onPreviewLog}
                onDelete={onDelete}
              />
            ))
          )}
        </div>

        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-center gap-1 border-t border-slate-100 px-4 py-2.5 dark:border-slate-700">
            <button onClick={() => onPageChange(1)} disabled={page <= 1}
              className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">처음</button>
            <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
              className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">이전</button>
            {Array.from({ length: Math.min(9, pagination.total_pages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 4, pagination.total_pages - 8));
              const p = start + i;
              return (
                <button key={p} onClick={() => onPageChange(p)}
                  className={`rounded px-3 py-1 text-[13px] transition ${p === page ? 'bg-blue-700 font-semibold text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => onPageChange(page + 1)} disabled={page >= pagination.total_pages}
              className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">다음</button>
            <button onClick={() => onPageChange(pagination.total_pages)} disabled={page >= pagination.total_pages}
              className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">끝</button>
          </div>
        )}
      </div>
    </div>
  );
}
