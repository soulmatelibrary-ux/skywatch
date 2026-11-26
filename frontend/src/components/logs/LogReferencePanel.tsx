import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { useUIStore } from '../../store/uiStore';
import type { LogCard, LogDetail } from '../../types/log';
import { useReferenceLogs } from '../../hooks/useReferenceLogs';
import { V2_INPUT, V2_OUTLINE, V2_PRIMARY } from '../common/v2Styles';
import { LogRefRow } from './LogRefRow';
import { LogRefCardModal, type RefCardTarget } from './LogRefCardModal';

interface Props {
  editor: Editor | null;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** 붙박이(도킹) 패널일 때만 넘김 — 제목 줄에 닫기 버튼이 생긴다 */
  onClose?: () => void;
}

const FOCUS = 'v2:focus-visible:ring-2 v2:focus-visible:ring-[var(--v2-accent)] v2:focus-visible:outline-none';

const PAGE_SIZE = 20;

function stripHtml(input: string | null | undefined) {
  return (input ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function buildCardLinkLabel(log: LogDetail, card: LogCard) {
  return `[${log.date}] ${card.title || log.title || `${log.shift_type} 카드`}`;
}

function buildCardLinkHtml(log: LogDetail, card: LogCard) {
  const label = buildCardLinkLabel(log, card)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `<a href="#card-${card.id}" class="sw-link" data-card-id="${card.id}">${label}</a>`;
}

function buildCardLinkPlainText(log: LogDetail, card: LogCard) {
  return buildCardLinkLabel(log, card);
}

function buildCardCopyText(log: LogDetail, card: LogCard) {
  const lines = [
    `[${log.date}] ${log.shift_type} ${log.title || '일지'}`,
    card.category_name ? `카테고리: ${card.category_name}` : null,
    card.title ? `카드 제목: ${card.title}` : null,
    stripHtml(card.content),
  ].filter(Boolean);
  return lines.join('\n');
}

function copyTextFallback(text: string): boolean {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;opacity:0;top:0;left:0;pointer-events:none';
  document.body.appendChild(el);
  el.focus();
  el.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  document.body.removeChild(el);
  return ok;
}

export function LogReferencePanel({ editor, collapsed = false, onToggleCollapse, onClose }: Props) {
  const { items, searchQ, setSearchQ, monthFilter, setMonthFilter, expandedLogId, selectLog, resultLabel } = useReferenceLogs();
  const addToast = useUIStore(s => s.addToast);
  const [detailTarget, setDetailTarget] = useState<RefCardTarget | null>(null);
  const [searchInput, setSearchInput] = useState(searchQ);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const loadMore = useCallback(() => setVisibleCount(prev => Math.min(prev + PAGE_SIZE, items.length)), [items.length]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQ, monthFilter]);

  useEffect(() => {
    setSearchInput(searchQ);
  }, [searchQ]);

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visibleCount < items.length;

  function runSearch() {
    setSearchQ(searchInput.trim());
  }

  async function handleCopy(log: LogDetail, card: LogCard) {
    const text = buildCardCopyText(log, card);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (!copyTextFallback(text)) {
        throw new Error();
      }
      addToast('카드 내용을 복사했습니다.', 'success');
    } catch {
      addToast('클립보드 복사에 실패했습니다.', 'error');
    }
  }

  async function handleAddLink(log: LogDetail, card: LogCard) {
    if (editor) {
      const label = buildCardLinkLabel(log, card);
      editor.chain().focus().insertContent({
        type: 'text',
        text: label,
        marks: [{ type: 'link', attrs: { href: `#card-${card.id}`, target: null, rel: null, 'data-card-id': card.id } }],
      }).insertContent(' ').run();
      addToast('참고 링크를 추가했습니다.', 'success');
      setDetailTarget(null);
      return;
    }

    // 활성 편집기가 없으면 클립보드 복사로 대체
    const html = buildCardLinkHtml(log, card);
    const plainText = buildCardLinkPlainText(log, card);
    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
          }),
        ]);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(plainText);
      } else if (!copyTextFallback(plainText)) {
        throw new Error();
      }
      addToast('링크를 복사했습니다. 에디터에 직접 붙여넣어 주세요.', 'success');
      setDetailTarget(null);
    } catch {
      addToast('링크 복사에 실패했습니다.', 'error');
    }
  }

  function handleOpenCard(log: LogDetail | null, card: LogCard, searchKeyword: string) {
    if (!log) return;
    setDetailTarget({ log, card, searchKeyword });
  }

  if (collapsed) {
    return (
      <div className="h-full min-h-0 flex flex-col bg-gradient-to-b from-slate-50 to-white border-l-2 border-emerald-500/70 dark:from-slate-950 dark:to-slate-900 dark:text-slate-100 dark:border-emerald-300/45">
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex h-full w-full items-center justify-center border-l-4 border-emerald-400/70 bg-slate-100/70 px-2 py-4 text-[12px] font-semibold text-emerald-700 transition hover:bg-slate-200/70 dark:border-emerald-300/60 dark:bg-slate-800/70 dark:text-emerald-200 dark:hover:bg-slate-700/80"
            title="참고 일지 펼치기"
          >
            <span className="rotate-90 whitespace-nowrap">펼치기</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="h-full min-h-0 flex flex-col bg-white border-l-2 border-emerald-500/70 dark:bg-slate-900 dark:text-slate-100 dark:border-emerald-300/45 v2:border-l-0 v2:bg-[var(--v2-panel)]">
        <div className="shrink-0 px-4 pt-4 pb-3 border-b border-emerald-300/70 dark:border-emerald-300/35 v2:border-[var(--v2-line-soft)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 v2:text-[var(--v2-text)]">참고 일지</h3>
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                title="참고 일지 접기"
              >
                접기
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="참고 일지 닫기"
                title="참고 일지 닫기"
                className={`ml-auto inline-flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 v2:text-[var(--v2-muted)] v2:hover:bg-[var(--v2-hover)] v2:hover:text-[var(--v2-text)] ${FOCUS}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="space-y-2 mb-3">
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => {
                if (e.key !== 'Enter' || (e.nativeEvent as any).isComposing) return;
                e.preventDefault();
                runSearch();
              }}
              placeholder="제목/작성자/카드 검색"
              className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-blue-400 ${V2_INPUT} v2:text-[var(--v2-text)]`}
            />
            <div className="flex items-center gap-2">
              <div className="flex items-center flex-1 min-w-0">
                <input
                  type="month"
                  value={monthFilter ?? ''}
                  onChange={e => setMonthFilter(e.target.value || null)}
                  className="flex-1 min-w-0 border border-slate-200 rounded-l-lg px-2.5 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-blue-400 v2:border-[var(--v2-line)] v2:bg-[var(--v2-panel)] v2:text-[var(--v2-text)]"
                />
                <button
                  onClick={() => setMonthFilter(null)}
                  title="필터 해제"
                  className="border border-l-0 border-slate-200 rounded-r-lg px-2 py-1.5 text-[12px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 v2:border-[var(--v2-line)] v2:text-[var(--v2-muted)] v2:hover:bg-[var(--v2-hover)] v2:hover:text-[var(--v2-text)]"
                >
                  ×
                </button>
              </div>
              <button onClick={runSearch} className={`px-3 py-1.5 text-[12px] border border-slate-200 rounded-lg hover:bg-slate-100 transition shrink-0 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 ${V2_PRIMARY} v2:border-[var(--v2-accent)] v2:hover:bg-[var(--v2-accent)] ${FOCUS}`}>
                검색
              </button>
              <button
                onClick={() => { setSearchInput(''); setSearchQ(''); setMonthFilter(null); }}
                className={`px-3 py-1.5 text-[12px] border border-slate-200 rounded-lg hover:bg-slate-100 transition shrink-0 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 ${V2_OUTLINE} v2:text-[var(--v2-text)] ${FOCUS}`}
              >
                초기화
              </button>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 v2:text-[12px] v2:text-[var(--v2-muted)]">{resultLabel}</p>
        </div>

        <div className="flex-1 min-h-0 pr-2">
          <div
            className="h-full overflow-y-auto p-3"
            onScroll={event => {
              if (!hasMore) return;
              const el = event.currentTarget;
              const remain = el.scrollHeight - el.scrollTop - el.clientHeight;
              if (remain < 120) loadMore();
            }}
          >
            <div className="space-y-3">
            {visibleItems.map(({ log, detail, matchedCards, searchKeyword }) => {
              const isExpanded = expandedLogId === log.id;
              const cards = searchQ.trim() ? matchedCards : (isExpanded && detail ? detail.cards : []);
              return <LogRefRow key={log.id} log={log} detail={detail} cards={cards} keyword={searchKeyword} onSelect={selectLog} onOpenCard={handleOpenCard} />;
            })}

            {items.length === 0 && <p className="text-[12px] text-slate-400 text-center py-8 dark:text-slate-500">조건에 맞는 참고 일지가 없습니다.</p>}
            {hasMore && <p className="text-[11px] text-slate-400 text-center py-2 dark:text-slate-500 v2:text-[12px]">스크롤하면 더 불러옵니다.</p>}
          </div>
          </div>
        </div>
      </div>

      {detailTarget && (
        <LogRefCardModal
          target={detailTarget}
          hasEditor={!!editor}
          onCopy={handleCopy}
          onAddLink={handleAddLink}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </>
  );
}
