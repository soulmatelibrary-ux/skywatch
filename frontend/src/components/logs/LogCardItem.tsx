import DOMPurify from 'dompurify';
import { useCallback, useEffect, useState } from 'react';
import { formatDateTimeISO } from '../../utils/dateUtils';
import { createPortal } from 'react-dom';
import type { LogCard, CardCategory, CardStatusItem, CardChainNode } from '../../types/log';
import { CardInlineEdit } from './CardInlineEdit';
import { LinkViewDialog } from './LinkViewDialog';
import { CardAttachSection } from './CardAttachSection';
import { highlightMentions, wrapMentionsInHTML } from '../../utils/mentionHighlight';
import { injectLogLinks, injectTechDocLinks } from '../../utils/logLinkUtils';
import { TechDocPreviewModal } from '../tech_docs/TechDocPreviewModal';
import { cardApi } from '../../services/api/logApi';
import { V2_INPUT, V2_OUTLINE } from '../common/v2Styles';
import type { Editor } from '@tiptap/core';

// 새 화면(v2) 전용: 카드 버튼은 윤곽선 버튼 하나의 체계로, 삭제만 빨강 글자로 떼어 놓는다
const V2_FOCUS = 'v2:focus-visible:ring-2 v2:focus-visible:ring-[var(--v2-accent)] v2:focus-visible:outline-none';
const V2_BTN = `${V2_OUTLINE} v2:text-[var(--v2-text)] ${V2_FOCUS}`;
const V2_DANGER = `v2:order-last v2:ml-[12px] v2:border-transparent v2:bg-transparent v2:text-red-600 v2:hover:bg-red-50 v2:dark:text-red-300 v2:dark:hover:bg-red-500/20 ${V2_FOCUS}`;

interface Props {
  card: LogCard;
  categories: CardCategory[];
  statuses: CardStatusItem[];
  canEdit: boolean;
  onStatusChange: (cardId: number, status: string) => void;
  onDelete?: (cardId: number) => void;
  editingId: number | null;
  isEditSubmitting: boolean;
  onStartEdit: (id: number) => void;
  onCancelEdit: () => void;
  onSaveEdit: (cardId: number, data: { title: string; content: string; category_id: number | null }) => void;
  onRegisterSave?: (fn: (() => void) | null) => void;
  onEditorReady?: (cardId: number, editor: Editor | null) => void;
  onRegisterHandlers?: (handlers: { onLinkClick: () => void; onImageUpload: () => void } | null) => void;
  logDate?: string;
  onRegisterInquiry?: () => void;
  onLogLinkClick?: (logId: number) => void;
  onCarryOver?: (cardId: number) => void;
}

export function LogCardItem({
  card,
  categories,
  statuses,
  canEdit,
  onStatusChange,
  onDelete,
  editingId,
  isEditSubmitting,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRegisterSave,
  onEditorReady,
  onRegisterHandlers,
  logDate,
  onRegisterInquiry,
  onLogLinkClick,
  onCarryOver,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [linkCard, setLinkCard] = useState<{ id: number; title: string } | null>(null);
  const [techDocId, setTechDocId] = useState<number | null>(null);
  const [chainNodes, setChainNodes] = useState<CardChainNode[] | null>(null);
  const [chainLoading, setChainLoading] = useState(false);

  // 카드 펼칠 때 체인 이력 로드 (1회)
  useEffect(() => {
    if (!expanded || chainNodes !== null) return;
    setChainLoading(true);
    cardApi.getChain(card.id)
      .then(res => setChainNodes(res.data?.data ?? []))
      .catch(() => setChainNodes([]))
      .finally(() => setChainLoading(false));
  }, [expanded, card.id, chainNodes]);

  const handleContentClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('a[href], .sw-link[data-card-id], .sw-log-link[data-log-id], .sw-td-link[data-techdoc-id]');
    if (!target) return;

    const techDocIdAttr = target.getAttribute('data-techdoc-id');
    if (techDocIdAttr) {
      e.preventDefault();
      const tdId = Number(techDocIdAttr);
      if (Number.isFinite(tdId) && tdId > 0) setTechDocId(tdId);
      return;
    }

    const logIdAttr = target.getAttribute('data-log-id');
    if (logIdAttr) {
      e.preventDefault();
      const logId = Number(logIdAttr);
      if (Number.isFinite(logId) && logId > 0) onLogLinkClick?.(logId);
      return;
    }

    const cardIdAttr = target.getAttribute('data-card-id');
    const hrefAttr = target.getAttribute('href') ?? '';
    const cardMatch = hrefAttr.match(/#card-(\d+)$/);
    const isInternalCardLink = !!cardIdAttr || !!cardMatch || hrefAttr === '#internal' || target.classList.contains('sw-link');

    if (isInternalCardLink) {
      e.preventDefault();
      const cardId = cardIdAttr ? Number(cardIdAttr) : Number(cardMatch?.[1]);
      const title = target.textContent ?? '';
      if (Number.isFinite(cardId) && cardId > 0) setLinkCard({ id: cardId, title });
      return;
    }

    const logHrefMatch = hrefAttr.match(/#log-(\d+)$/);
    if (logHrefMatch) {
      e.preventDefault();
      const logId = Number(logHrefMatch[1]);
      if (Number.isFinite(logId) && logId > 0) onLogLinkClick?.(logId);
      return;
    }

    if (hrefAttr.startsWith('#')) {
      e.preventDefault();
      return;
    }

    if (target instanceof HTMLAnchorElement && /^https?:/i.test(target.href)) {
      e.preventDefault();
      const w = 1200, h = 800;
      const left = Math.round((screen.width - w) / 2);
      const top = Math.round((screen.height - h) / 2);
      window.open(target.href, `ext_${Date.now()}`, `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
    }
  }, [onLogLinkClick]);

  const handleSaveEdit = useCallback((cardId: number, data: { title: string; content: string; category_id: number | null }) => {
    onSaveEdit(cardId, data);
    const category = categories.find(c => c.id === data.category_id);
    if (category?.name === '문의사항' && onRegisterInquiry) {
      setTimeout(() => onRegisterInquiry(), 400);
    }
  }, [onSaveEdit, categories, onRegisterInquiry]);

  const statusItem = statuses.find(s => s.key === card.status);
  const color = card.status_color ?? statusItem?.color ?? '#6b7280';
  const statusLabel = statusItem?.label ?? card.status;

  const isDark = document.documentElement.classList.contains('dark');
  const headerStyle = { background: isDark ? '#1e293b' : `${color}22`, borderColor: isDark ? `${color}44` : `${color}32` };
  const borderStyle = { borderColor: `${color}${isDark ? '66' : '60'}`, borderLeftColor: color, borderLeftWidth: '4px' };
  const badgeStyle = { background: `${color}${isDark ? '45' : '28'}`, color: isDark ? `${color}ff` : color };

  if (editingId === card.id) {
    return (
      <CardInlineEdit
        card={card}
        categories={categories}
        isSubmitting={isEditSubmitting}
        onSave={data => handleSaveEdit(card.id, data)}
        onCancel={onCancelEdit}
        onRegisterSave={onRegisterSave}
        onEditorReady={editor => onEditorReady?.(card.id, editor)}
        onRegisterHandlers={onRegisterHandlers}
      />
    );
  }

  return (
    <>
      {linkCard && createPortal(
        <LinkViewDialog cardId={linkCard.id} cardTitle={linkCard.title} onClose={() => setLinkCard(null)} />,
        document.body
      )}
      {techDocId !== null && createPortal(
        <TechDocPreviewModal docId={techDocId} onClose={() => setTechDocId(null)} />,
        document.body
      )}
      <div className="rounded-xl border overflow-hidden bg-slate-50 shadow-sm dark:bg-slate-800/60 v2:rounded-md v2:shadow-none" style={borderStyle}>
        <div
          className="flex items-center gap-3 px-4 py-3 border-b cursor-pointer hover:brightness-95 transition dark:border-slate-700 flex-wrap gap-y-2"
          style={headerStyle}
          onClick={() => setExpanded(e => !e)}
        >
          <span className="text-[12px] px-2.5 py-1 rounded-full font-semibold shrink-0" style={badgeStyle}>
            {statusLabel}
          </span>
          {card.category_name && (
            <span
              className="text-[12px] font-medium px-2.5 py-1 rounded-full shrink-0"
              style={card.category_color
              ? { background: `${card.category_color}${isDark ? '33' : '22'}`, color: isDark ? `${card.category_color}ff` : card.category_color }
              : isDark ? { background: '#334155', color: '#94a3b8' } : { background: '#f1f5f9', color: '#64748b' }}
            >
              {card.category_name}
            </span>
          )}
          <span className="font-semibold text-slate-900 text-[16px] flex-1 min-w-0 truncate dark:text-slate-100 min-w-[140px]">{highlightMentions(card.title)}</span>
          <div className="flex items-center gap-1 shrink-0 v2:gap-[8px]" onClick={e => e.stopPropagation()}>
            {canEdit && (
              <>
                <button
                  onClick={() => onStartEdit(card.id)}
                  disabled={editingId !== null && editingId !== card.id}
                  title={editingId !== null && editingId !== card.id ? '다른 카드 수정 중입니다' : undefined}
                  className={`text-[12px] px-2.5 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md border border-blue-600 transition disabled:opacity-40 disabled:cursor-not-allowed ${V2_BTN}`}
                >
                  수정
                </button>
                {onDelete && (
                  <button
                    onClick={() => onDelete(card.id)}
                    className={`text-[12px] px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md border border-red-600 transition ${V2_DANGER}`}
                  >
                    삭제
                  </button>
                )}
              </>
            )}
            {logDate && onRegisterInquiry && (
              <button
                onClick={onRegisterInquiry}
                disabled={editingId !== null && editingId !== card.id}
                className={`text-[12px] px-2.5 py-1 bg-green-500 hover:bg-green-600 text-white rounded-md border border-green-600 transition disabled:opacity-40 disabled:cursor-not-allowed ${V2_BTN}`}
              >
                문의등록
              </button>
            )}
            {canEdit && card.status !== 'done' && onCarryOver && (
              <button
                onClick={() => onCarryOver(card.id)}
                disabled={editingId !== null && editingId !== card.id}
                title="이 카드를 오늘 일지로 이월합니다"
                className={`text-[12px] px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md border border-amber-600 transition disabled:opacity-40 disabled:cursor-not-allowed ${V2_BTN}`}
              >
                이월
              </button>
            )}
            <select
              value={card.status}
              onChange={e => onStatusChange(card.id, e.target.value)}
              disabled={!canEdit}
              className={`text-[13px] px-3 py-1.5 border border-slate-200 rounded bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-100 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 dark:focus:ring-cyan-400 ${V2_INPUT} v2:text-[var(--v2-text)]`}
              title="카드 상태 변경"
            >
              {statuses.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`text-slate-400 shrink-0 transition-transform dark:text-slate-500 ${expanded ? 'rotate-90' : ''}`}
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </div>
        {expanded && (
          <div className="px-6 py-5 space-y-4 bg-white dark:bg-slate-900">
            {card.content ? (
              <div
                className="text-[16px] text-slate-700 sw-content dark:text-slate-200"
                style={{ lineHeight: '1.9' }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(injectTechDocLinks(injectLogLinks(wrapMentionsInHTML(card.content)))) }}
                onClick={handleContentClick}
              />
            ) : (
              <p className="text-[15px] text-slate-400 italic dark:text-slate-500">내용 없음</p>
            )}
            {card.status === 'done' && card.completed_by_name && (
              <div className="flex items-center gap-1.5 border-t border-slate-100 pt-2.5 text-[12px] font-medium text-sky-700 dark:border-slate-700 dark:text-sky-300">
                <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[11px] font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-200">
                  완료
                </span>
                <span>{card.completed_by_name} · {card.completed_at?.slice(0, 16) ?? ''}</span>
              </div>
            )}
            {card.last_edited_by_name && (
              <div className="text-[12px] text-slate-400 border-t border-slate-100 pt-2.5 dark:border-slate-700 dark:text-slate-500">
                최근 수정: {card.last_edited_by_name} · {formatDateTimeISO(card.updated_at)}
              </div>
            )}
            <CardAttachSection cardId={card.id} canDelete={canEdit} />
            {/* 체인 타임라인 — 연결된 카드가 있으면 인라인 표시 */}
            {chainLoading && (
              <div className="border-t border-slate-100 pt-2 text-[12px] text-slate-400 dark:border-slate-700">
                이력 확인 중...
              </div>
            )}
            {chainNodes && chainNodes.length > 0 && (() => {
              const flatten = (nodes: CardChainNode[]): CardChainNode[] =>
                nodes.flatMap(n => [n, ...flatten(n.children)]);
              const all = flatten(chainNodes).sort((a, b) => a.log_date.localeCompare(b.log_date));
              if (all.length < 2) return null;
              return (
                <div className="border-t border-slate-100 pt-3 dark:border-slate-700">
                  <div className="mb-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    업무 이력 ({all.length}건)
                  </div>
                  <div className="relative ml-2 border-l-2 border-slate-200 pl-4 dark:border-slate-700">
                    {all.map(n => {
                      const isCurrent = n.card_id === card.id;
                      const isDone = n.status === 'done';
                      const dotColor = isCurrent ? 'bg-blue-500' : isDone ? 'bg-emerald-400' : 'bg-slate-300 dark:bg-slate-600';
                      return (
                        <div key={n.card_id} className={`relative mb-2 pb-1 ${isCurrent ? 'font-semibold' : ''}`}>
                          <div className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${dotColor} ring-2 ring-white dark:ring-slate-900`} />
                          <div className="flex items-center gap-2 text-[12px]">
                            <span className="text-slate-400 dark:text-slate-500">{n.log_date}</span>
                            <span className={`truncate ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>
                              {n.card_title}
                            </span>
                            {isDone && <span className="shrink-0 text-[10px] text-emerald-500">완료</span>}
                            {isCurrent && <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">현재</span>}
                          </div>
                          {n.log_author && (
                            <div className="text-[11px] text-slate-400 dark:text-slate-500">
                              {n.log_shift_type} {n.log_author}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </>
  );
}
