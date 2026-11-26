import type { KeyboardEvent } from 'react';
import type { Notification } from '../../types/notification';
import { formatDistanceToNow } from '../../utils/dateUtils';

interface Props {
  notif: Notification;
  showBadge?: boolean;
  onRead: (id: number) => void;
  onOpen?: (notif: Notification) => void;
  onPreviewLog?: (notif: Notification) => void;
  onDelete?: (id: number) => void;
}

const CATEGORY_MAP: Record<string, { label: string; iconClass: string; badgeClass: string }> = {
  task: { label: '업무', iconClass: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300', badgeClass: 'border-purple-300 text-purple-700 bg-purple-50 dark:border-purple-500/30 dark:text-purple-300 dark:bg-purple-500/10' },
  comment: { label: '댓글', iconClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', badgeClass: 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:bg-emerald-500/10' },
  mention: { label: '멘션', iconClass: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300', badgeClass: 'border-cyan-300 text-cyan-700 bg-cyan-50 dark:border-cyan-500/30 dark:text-cyan-300 dark:bg-cyan-500/10' },
  card: { label: '카드 변경', iconClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300', badgeClass: 'border-indigo-300 text-indigo-700 bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:bg-indigo-500/10' },
  card_edited: { label: '수정', iconClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', badgeClass: 'border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-500/30 dark:text-amber-300 dark:bg-amber-500/10' },
};

const DEFAULT_CAT = {
  label: '기본',
  iconClass: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  badgeClass: 'border-slate-300 text-slate-700 bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:bg-slate-800',
};

function getCat(type: string) {
  return CATEGORY_MAP[type] ?? DEFAULT_CAT;
}

export function NotificationItem({ notif, showBadge = false, onRead, onOpen, onPreviewLog, onDelete }: Props) {
  const cat = getCat(notif.type);
  const isUnread = !notif.read_at;
  const canOpen = !!(notif.ref_id && (onOpen || onPreviewLog));

  const openItem = () => {
    if (notif.ref_type === 'log' && notif.ref_id && onPreviewLog) {
      onPreviewLog(notif);
      return;
    }
    if (notif.ref_id && onOpen) {
      onOpen(notif);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!canOpen) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openItem();
    }
  };

  return (
    <div
      role={canOpen ? 'button' : undefined}
      tabIndex={canOpen ? 0 : undefined}
      onClick={canOpen ? openItem : undefined}
      onKeyDown={handleKeyDown}
      className={[
        'group flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 transition-colors duration-150 dark:border-slate-700/70',
        isUnread
          ? 'bg-blue-50/60 hover:bg-blue-50/80 dark:bg-blue-900/20 dark:hover:bg-blue-900/30'
          : 'bg-white hover:bg-blue-50/30 dark:bg-slate-900 dark:hover:bg-slate-800/60',
        canOpen ? 'cursor-pointer' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-2 shrink-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${isUnread ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ring-1 ring-black/5 ${cat.iconClass}`}>
          {cat.label.slice(0, 1)}
        </div>
      </div>

      <div className="min-w-0 flex-1 flex items-center gap-2">
        {showBadge && (
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cat.badgeClass}`}>
            {cat.label}
          </span>
        )}
        <p
          className={[
            'min-w-0 flex-1 truncate text-[13px] leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors',
            isUnread ? 'font-bold text-slate-800 dark:text-slate-100' : 'font-medium text-slate-700 dark:text-slate-300',
          ].join(' ')}
          title={notif.body ?? undefined}
        >
          {notif.body}
        </p>
        <span className="shrink-0 whitespace-nowrap text-[12px] font-medium text-slate-400 dark:text-slate-500">
          {formatDistanceToNow(notif.created_at)}
        </span>
      </div>

      <div className="shrink-0 flex items-center gap-1">
        {notif.type === 'card' && (
          <span className="whitespace-nowrap rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            완료
          </span>
        )}
        {notif.ref_type === 'log' && notif.ref_id && onPreviewLog && (
          <button
            onClick={e => { e.stopPropagation(); onPreviewLog(notif); }}
            className="whitespace-nowrap rounded-full border border-violet-300 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-100 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300"
          >
            미리보기
          </button>
        )}
        {notif.ref_id && onOpen && (
          <button
            onClick={e => { e.stopPropagation(); onOpen(notif); }}
            className="whitespace-nowrap rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
          >
            열기
          </button>
        )}
        {isUnread && (
          <button
            onClick={e => { e.stopPropagation(); onRead(notif.id); }}
            className="whitespace-nowrap rounded-full border border-blue-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-500/30 dark:bg-slate-900 dark:text-blue-300"
          >
            읽음
          </button>
        )}
        {onDelete && (
          <button
            onClick={e => { e.stopPropagation(); if (!window.confirm('이 알림을 삭제하시겠습니까?')) return; onDelete(notif.id); }}
            className="whitespace-nowrap rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-red-500/40 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
            title="알림 삭제"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
