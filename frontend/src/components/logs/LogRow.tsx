import { useCallback, useState, type ReactNode } from 'react';
import type { Log } from '../../types/log';
import { highlightMentions } from '../../utils/mentionHighlight';
import { formatDateTimeISO } from '../../utils/dateUtils';

const SHIFT_COLOR: Record<string, string> = {
  주간: 'bg-green-500 text-white dark:bg-green-500 dark:text-white',
  야간: 'bg-blue-600 text-white dark:bg-blue-500 dark:text-white',
  주야: 'bg-violet-600 text-white dark:bg-violet-500 dark:text-white',
  비번: 'bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-100',
  당직: 'bg-emerald-500 text-white dark:bg-emerald-500 dark:text-white',
  공지: 'bg-red-500 text-white dark:bg-red-500 dark:text-white',
};

interface Props {
  log: Log;
  onClick: (log: Log) => void;
  searchMethods?: Set<'keyword' | 'vector'>;
  searchSnippet?: string;
  searchQuery?: string;
  onOpenPopup?: (log: Log) => void;
  isNewNotice?: boolean;
}

function formatTeam(team: string | null): string {
  if (!team) return '';
  return team === 'day' ? '주간' : `${team.toUpperCase()}조`;
}

function highlightSearchTerms(text: string, query?: string): ReactNode {
  if (!query || !text) return text;
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return text;
  const pattern = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    pattern.test(part) ? (
      <span key={i} className="bg-yellow-200 font-semibold">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function StatIcon({ type }: { type: 'card' | 'link' | 'attach' | 'comment' }) {
  const common = 'w-3.5 h-3.5 shrink-0';
  switch (type) {
    case 'card':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 9h8" />
          <path d="M8 13h5" />
        </svg>
      );
    case 'link':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L17 12" />
          <path d="M14 11a5 5 0 0 1 0 7L12.5 19.5a5 5 0 0 1-7-7L7 12" />
        </svg>
      );
    case 'attach':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.5l-8.9 8.9a5 5 0 0 1-7.1-7.1l9.2-9.2a3.5 3.5 0 1 1 5 5l-9.2 9.2a2 2 0 1 1-2.8-2.8l8.5-8.5" />
        </svg>
      );
    case 'comment':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a4 4 0 0 1-4 4H9l-6 3 2-5a4 4 0 0 1-1-2V7a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4z" />
        </svg>
      );
  }
}

function StatBadge({
  label,
  count,
  tone,
  icon,
}: {
  label: string;
  count: number;
  tone: {
    active: string;
    inactive: string;
  };
  icon: 'card' | 'link' | 'attach' | 'comment';
}) {
  const cls = count > 0 ? tone.active : tone.inactive;
  // 새 화면: 색 알약 대신 아이콘+숫자만, 0이면 흐리게 (index.css .v2-stat)
  return (
    <div
      data-zero={count > 0 ? undefined : ''}
      className={`v2-stat flex items-center gap-1.5 px-3 py-1.5 min-w-[54px] justify-center rounded-xl border text-[13px] font-extrabold leading-none transition-all duration-150 ${cls}`}
      title={label}
    >
      <StatIcon type={icon} />
      <span className="tabular-nums tracking-tight">{count}</span>
    </div>
  );
}

export function LogRow({ log, onClick, searchMethods, searchSnippet, searchQuery, onOpenPopup, isNewNotice }: Props) {
  const [copied, setCopied] = useState(false);
  const copySeq = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`#LOG:${log.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [log.id]);

  const shiftCls = SHIFT_COLOR[log.shift_type] ?? 'bg-slate-100 text-slate-600';
  const date = log.date.replace(/-/g, '.');
  const normalizedTags = (log.tags ?? []).map(t => t.trim()).filter(Boolean);
  const representativeCategory = normalizedTags.length > 0 ? normalizedTags[0] : (log.title ?? '');
  const isNotice = log.shift_type === '공지';

  return (
    <tr
      onClick={() => onClick(log)}
      data-shift={log.shift_type}
      className={`cursor-pointer transition-colors duration-150 group [&>td]:v2:h-[44px] [&>td]:v2:py-0 [&>td]:v2:px-3 ${
        isNotice
          ? 'bg-amber-50/70 dark:bg-amber-950/20 hover:bg-amber-100/80 dark:hover:bg-amber-900/30 border-l-4 border-l-red-400'
          : `hover:bg-blue-50/40 dark:hover:bg-slate-800/40 v2:hover:bg-[var(--v2-hover)] ${log.is_read ? '' : 'font-semibold bg-slate-50/60 dark:bg-slate-800/20 v2:bg-transparent'}`
      }`}
    >
      <td className="px-5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-slate-700 dark:text-slate-200 font-mono tracking-tight whitespace-nowrap">{date}</span>
          <span data-shift={log.shift_type} className={`v2-shift px-2 py-0.5 rounded text-[11px] font-bold inline-block shrink-0 ${shiftCls}`}>
            {log.shift_type}
          </span>
          {isNotice && isNewNotice && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold inline-block shrink-0 bg-yellow-400 text-yellow-900 animate-pulse">
              NEW
            </span>
          )}
        </div>
      </td>

      <td className="px-5 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[13.5px] font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
            {log.primary_worker_name ?? log.author_name ?? '-'}
          </span>
          {(log.primary_worker_team ?? log.team) && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
              {formatTeam(log.primary_worker_team ?? log.team)}
            </span>
          )}
          {searchMethods && searchMethods.size > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {searchMethods.has('vector') && (
                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-700 border border-blue-300">
                  벡터 검색
                </span>
              )}
              {searchMethods.has('keyword') && (
                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  키워드 검색
                </span>
              )}
            </div>
          )}
        </div>
      </td>

      <td className="px-5 py-2.5 v2:max-w-0 v2:w-full">
        {/* 새 화면: 제목과 키워드를 한 줄에 — 행 높이를 44px 로 고정한다. 안 읽은 일지만 제목을 굵게 */}
        <div className={`flex flex-col gap-1.5 max-w-xl v2:flex-row v2:items-center v2:max-w-none v2:min-w-0 [&>div:first-child]:v2:truncate ${log.is_read ? '[&>div:first-child]:v2:font-medium' : ''}`}>
          {searchSnippet ? (
            <>
              <div className="text-[14px] font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {highlightMentions(representativeCategory) || '-'}
              </div>
              <div className="text-[12px] text-slate-500 dark:text-slate-500 line-clamp-2">
                {highlightSearchTerms(searchSnippet, searchQuery)}
              </div>
            </>
          ) : (
            <div className="text-[14px] font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {highlightMentions(representativeCategory) || '-'}
            </div>
          )}
          {normalizedTags.length > 1 && (
            <div className="flex flex-wrap gap-1 v2:flex-nowrap v2:shrink-0">
              {normalizedTags.slice(1).map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full text-[11px] font-semibold">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </td>

      <td className="px-5 py-2.5">
        <div className="flex items-center justify-center gap-2">
          <StatBadge
            label="카드 수"
            count={log.card_count}
            icon="card"
            tone={{
              active: 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-900/20 dark:bg-indigo-500 dark:text-white dark:border-indigo-400',
              inactive: 'bg-slate-900/55 text-slate-300 border-slate-700/70 shadow-sm dark:bg-slate-900/70 dark:text-slate-300 dark:border-slate-700/80',
            }}
          />
          <StatBadge
            label="연결 카드"
            count={log.link_count}
            icon="link"
            tone={{
              active: 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-900/20 dark:bg-emerald-500 dark:text-white dark:border-emerald-400',
              inactive: 'bg-slate-900/55 text-slate-300 border-slate-700/70 shadow-sm dark:bg-slate-900/70 dark:text-slate-300 dark:border-slate-700/80',
            }}
          />
          <StatBadge
            label="첨부파일"
            count={log.attach_count}
            icon="attach"
            tone={{
              active: 'bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-900/20 dark:bg-amber-500 dark:text-white dark:border-amber-400',
              inactive: 'bg-slate-900/55 text-slate-300 border-slate-700/70 shadow-sm dark:bg-slate-900/70 dark:text-slate-300 dark:border-slate-700/80',
            }}
          />
          <StatBadge
            label="코멘트"
            count={log.comment_count}
            icon="comment"
            tone={{
              active: 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-900/20 dark:bg-rose-500 dark:text-white dark:border-rose-400',
              inactive: 'bg-slate-900/55 text-slate-300 border-slate-700/70 shadow-sm dark:bg-slate-900/70 dark:text-slate-300 dark:border-slate-700/80',
            }}
          />
        </div>
      </td>

      <td className="px-5 py-2.5 text-center">
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1 v2:whitespace-nowrap">
            <span className={`w-2 h-2 rounded-full inline-block ${log.is_read ? 'bg-emerald-500 v2:bg-slate-300 v2:dark:bg-slate-600' : 'bg-red-500 animate-pulse v2:bg-[var(--v2-accent)] v2:animate-none'}`} />
            <span className={`text-[12px] font-bold ${log.is_read ? 'text-slate-500 dark:text-slate-400 v2:font-medium' : 'text-red-500 v2:text-[var(--v2-accent)]'}`}>
              {log.is_read ? '읽음' : '미읽음'}
            </span>
          </div>
        </div>
      </td>

      <td className="px-5 py-2.5 text-center">
        <span className="text-[12px] text-slate-400 dark:text-slate-500 font-medium v2:hidden">
          {formatDateTimeISO(log.updated_at)}
        </span>
        {/* 새 화면: 한 줄로 짧게 (MM-DD HH:mm) */}
        <span className="hidden whitespace-nowrap text-[12px] tabular-nums text-slate-500 dark:text-slate-400 v2:inline">
          {formatDateTimeISO(log.updated_at).slice(5, 16)}
        </span>
      </td>

      <td className="px-5 py-2.5 text-center">
        <div className="flex flex-col items-center gap-1 v2:flex-row v2:justify-center v2:gap-2">
          {log.in_progress_count > 0
            ? <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-full text-[11px] font-extrabold border border-orange-200 dark:border-orange-700">{log.in_progress_count}</span>
            : <span className="text-slate-300 dark:text-slate-600 text-[12px]">-</span>}
          <div className="flex items-center gap-1">
            <button
              onClick={copySeq}
              title="로그 참조 ID 복사 (#LOG:ID)"
              className={`text-[10px] font-mono leading-none transition-colors px-1 rounded ${copied ? 'text-emerald-500' : 'text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400'}`}
            >
              #{log.id}
            </button>
            {onOpenPopup && (
              <button
                onClick={e => { e.stopPropagation(); onOpenPopup(log); }}
                title="새 창으로 열기"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400 p-0.5 rounded"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}
