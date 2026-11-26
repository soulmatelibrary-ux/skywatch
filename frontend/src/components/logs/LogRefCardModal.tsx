// 참고 일지 패널의 카드 미리보기 창 — 내용 복사 / 링크 추가(편집기가 없으면 링크 복사)
import { useMemo } from 'react';
import DOMPurify from 'dompurify';
import type { LogCard, LogDetail } from '../../types/log';
import { V2_OUTLINE, V2_PRIMARY } from '../common/v2Styles';
import { STATUS_CLS, STATUS_LABEL } from './LogRefShared';

export interface RefCardTarget { log: LogDetail; card: LogCard; searchKeyword: string }

interface Props {
  target: RefCardTarget;
  hasEditor: boolean;
  onCopy: (log: LogDetail, card: LogCard) => void;
  onAddLink: (log: LogDetail, card: LogCard) => void;
  onClose: () => void;
}

function highlightKeyword(html: string, keyword: string): string {
  if (!keyword.trim()) return html;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return html.replace(regex, '<mark class="bg-yellow-300 text-slate-900 rounded px-0.5 font-semibold">$1</mark>');
}

const FOCUS = 'v2:focus-visible:ring-2 v2:focus-visible:ring-[var(--v2-accent)] v2:focus-visible:outline-none';

export function LogRefCardModal({ target, hasEditor, onCopy, onAddLink, onClose }: Props) {
  const { log, card, searchKeyword } = target;
  const html = useMemo(() => {
    if (!card.content) return '';
    const sanitized = DOMPurify.sanitize(card.content);
    return searchKeyword ? highlightKeyword(sanitized, searchKeyword) : sanitized;
  }, [card.content, searchKeyword]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 px-8 v2:z-[80] v2:bg-black/30">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="참고 카드 미리보기"
        className="flex h-[78vh] w-full max-w-[800px] flex-col overflow-hidden rounded-[24px] border border-emerald-500/75 bg-white shadow-[0_24px_80px_-24px_rgba(15,23,42,0.45)] dark:border-emerald-300/40 dark:bg-slate-900 v2:h-[78vh] v2:max-w-[800px] v2:rounded-md v2:border-[var(--v2-line)] v2:bg-[var(--v2-panel)] v2:shadow-md"
      >
        <div className="flex items-start justify-between gap-6 border-b border-emerald-400/60 px-7 py-5 dark:border-emerald-300/30 v2:border-[var(--v2-line-soft)] v2:px-[28px] v2:py-[20px]">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold v2:text-[12px] ${STATUS_CLS[card.status] ?? 'bg-slate-100 text-slate-600'}`}>
                {STATUS_LABEL[card.status] ?? card.status}
              </span>
              {card.category_name && (
                <span
                  className="text-[10px] px-2.5 py-1 rounded-full v2:text-[12px]"
                  style={{ background: `${card.category_color ?? '#64748b'}22`, color: card.category_color ?? '#64748b' }}
                >
                  {card.category_name}
                </span>
              )}
              <span className="text-[11px] text-slate-400 dark:text-slate-500 v2:text-[12px] v2:text-[var(--v2-muted)]">{log.date} · {log.shift_type}</span>
            </div>
            <div className="text-[18px] font-semibold text-slate-800 dark:text-slate-100">{card.title || log.title || '참고 카드'}</div>
            <div className="mt-1 text-[12px] text-slate-500 dark:text-slate-400">근무자 {log.primary_worker_name ?? '-'}</div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => onCopy(log, card)} className={`rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 ${V2_OUTLINE} v2:text-[var(--v2-text)] ${FOCUS}`}>
              내용 복사
            </button>
            <button onClick={() => onAddLink(log, card)} className={`rounded-lg bg-blue-600 px-3 py-2 text-[12px] font-medium text-white transition hover:bg-blue-700 dark:bg-cyan-600 dark:hover:bg-cyan-500 ${V2_PRIMARY} v2:hover:bg-[var(--v2-accent)] ${FOCUS}`}>
              {hasEditor ? '링크 추가' : '링크 복사'}
            </button>
            <button onClick={onClose} className={`rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-medium text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 ${V2_OUTLINE} v2:text-[var(--v2-text)] ${FOCUS}`}>
              닫기
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-7 py-6 v2:px-[28px] v2:py-[24px]">
          {card.content ? (
            <div className="sw-content rounded-[20px] border border-slate-200 bg-slate-50 px-6 py-5 text-[14px] leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 v2:rounded-md v2:px-[24px] v2:py-[20px] v2:leading-[28px]" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-[13px] text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-500 v2:rounded-md v2:px-[24px] v2:py-[40px]">
              카드 내용이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
