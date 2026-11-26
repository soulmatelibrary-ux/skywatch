import DOMPurify from 'dompurify';
import { useEffect } from 'react';
import { formatDateTimeISO } from '../../utils/dateUtils';
import type { LogDetail, CardStatusItem } from '../../types/log';
import { wrapMentionsInHTML } from '../../utils/mentionHighlight';
import { useDraggableResizable } from '../../hooks/useDraggableResizable';
import { attachmentApi } from '../../services/api/attachmentApi';
import { triggerDownload } from '../../services/attachmentOpen';

const LOG_PDF_VIEW_SIZE = { width: 1412, height: 1020 };

const SHIFT_BADGE: Record<string, string> = {
  주간: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200',
  야간: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200',
  주야: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-200',
  비번: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-300',
  공휴: 'bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-200',
};

const ROLE_LABEL: Record<string, string> = {
  primary: '',
  sub: '(대체)',
  support: '(지원)',
  overtime: '(초과)',
};

function fmtDatetime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Props {
  detail: LogDetail;
  statuses: CardStatusItem[];
  onClose: () => void;
}

export function LogPdfView({ detail, statuses, onClose }: Props) {
  const teamLabel = detail.team === 'day' ? '주간' : detail.team ? `${detail.team}조` : '';
  const isModified = detail.updated_at !== detail.created_at;
  const { pos, size, onDragStart, onResizeStart } = useDraggableResizable(LOG_PDF_VIEW_SIZE, 'sw-modal-pdf-size');

  useEffect(() => {
    document.body.classList.add('sw-pdf-open');
    return () => document.body.classList.remove('sw-pdf-open');
  }, []);

  return (
    <div className="sw-pdf-overlay fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="sw-pdf-doc absolute bg-white shadow-2xl rounded-xl flex flex-col overflow-hidden dark:bg-slate-900 dark:text-slate-100"
        style={{ left: pos.x, top: pos.y, width: size.width, height: size.height }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="sw-pdf-topbar flex items-center justify-between px-8 py-4 border-b border-slate-200 cursor-move select-none dark:border-slate-700"
          onMouseDown={onDragStart}
        >
          <h2 className="text-[18px] font-bold text-slate-800 dark:text-slate-100">업무 일지</h2>
          <div className="flex items-center gap-2 cursor-auto" onMouseDown={e => e.stopPropagation()}>
            <button
              onClick={() => window.print()}
              className="h-8 px-3 border border-slate-300 rounded-lg text-[13px] hover:bg-slate-100 transition dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              인쇄
            </button>
            <button
              onClick={onClose}
              className="h-8 px-3 border border-slate-300 rounded-lg text-[13px] hover:bg-slate-100 transition dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              닫기
            </button>
          </div>
        </div>

        <div className="px-8 py-3 border-b border-slate-100 flex items-center gap-x-3 gap-y-1 flex-wrap text-[13px] dark:border-slate-700 dark:text-slate-300">
          <span className="font-bold text-slate-800 dark:text-slate-100">{detail.date}</span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className={`px-2 py-0.5 rounded font-semibold ${SHIFT_BADGE[detail.shift_type] ?? 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-300'}`}>
            {detail.shift_type}
          </span>
          {teamLabel && (
            <>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded dark:bg-slate-800 dark:text-slate-200">{teamLabel}</span>
            </>
          )}
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="text-slate-500 dark:text-slate-300"><span className="text-slate-400 dark:text-slate-500">작성자</span> <span className="font-semibold text-slate-700 dark:text-slate-100">{detail.author_name}</span></span>
          {detail.participants.length > 0 && (
            <>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="text-slate-500 dark:text-slate-300">
                <span className="text-slate-400 dark:text-slate-500">참여 </span>
                {detail.participants.map((p, i) => (
                  <span key={p.user_id}>
                    {i > 0 && ', '}
                    <span className="font-medium text-slate-700 dark:text-slate-100">{p.name ?? `#${p.user_id}`}</span>
                    {ROLE_LABEL[p.role] && <span className="text-slate-400 dark:text-slate-500"> {ROLE_LABEL[p.role]}</span>}
                  </span>
                ))}
              </span>
            </>
          )}
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="text-slate-400 dark:text-slate-500">작성 {fmtDatetime(detail.created_at)}</span>
          {isModified && (
            <>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="text-slate-400 dark:text-slate-500">수정 {fmtDatetime(detail.updated_at)}</span>
            </>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6 space-y-6 dark:bg-slate-900">
          {detail.cards.map((card, idx) => {
            const statusItem = statuses.find(s => s.key === card.status);
            const color = statusItem?.color ?? '#6b7280';
            const statusLabel = statusItem?.label ?? card.status;

            return (
              <div key={card.id} className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-slate-400 dark:text-slate-500">{idx + 1}.</span>
                  <span className="text-[12px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${color}22`, color }}>
                    {statusLabel}
                  </span>
                  {card.category_name && (
                    <span
                      className="text-[12px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: card.category_color ? `${card.category_color}22` : '#f1f5f9', color: card.category_color ?? '#64748b' }}
                    >
                      {card.category_name}
                    </span>
                  )}
                  <span className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">{card.title}</span>
                </div>
                {card.content && (
                  <div
                    className="text-[14px] text-slate-700 leading-relaxed sw-content pl-6 dark:text-slate-200"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(wrapMentionsInHTML(card.content)) }}
                  />
                )}
                {card.status === 'done' && card.completed_by_name && (
                  <div className="text-[12px] text-green-600 pl-6 dark:text-green-300">
                    완료: {card.completed_by_name} · {card.completed_at ? formatDateTimeISO(card.completed_at) : ''}
                  </div>
                )}
                {card.attachments.length > 0 && (
                  <div className="pl-6 flex flex-wrap gap-2">
                    {card.attachments.map(att => (
                      <button
                        key={att.id}
                        type="button"
                        onClick={() => void triggerDownload(attachmentApi.downloadUrl(att.id, true), att.original_name)}
                        className="text-[12px] px-2 py-1 bg-slate-50 border border-slate-200 rounded text-blue-600 hover:bg-slate-100 transition cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-cyan-200 dark:hover:bg-slate-700"
                      >
                        {att.original_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {detail.cards.length === 0 && <p className="text-[14px] text-slate-400 italic dark:text-slate-500">카드 없음</p>}
        </div>

        <div className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize z-10" onMouseDown={onResizeStart('nw')} />
        <div className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize z-10" onMouseDown={onResizeStart('ne')} />
        <div className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize z-10" onMouseDown={onResizeStart('sw')} />
        <div className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize z-10" onMouseDown={onResizeStart('se')} />
        <div className="absolute top-0 left-3 right-3 h-1.5 cursor-n-resize z-10" onMouseDown={onResizeStart('n')} />
        <div className="absolute bottom-0 left-3 right-3 h-1.5 cursor-s-resize z-10" onMouseDown={onResizeStart('s')} />
        <div className="absolute left-0 top-3 bottom-3 w-1.5 cursor-w-resize z-10" onMouseDown={onResizeStart('w')} />
        <div className="absolute right-0 top-3 bottom-3 w-1.5 cursor-e-resize z-10" onMouseDown={onResizeStart('e')} />
      </div>
    </div>
  );
}
