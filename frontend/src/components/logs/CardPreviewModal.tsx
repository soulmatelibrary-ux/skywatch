import DOMPurify from 'dompurify';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cardApi } from '../../services/api/logApi';
import { openLogPopup } from '../../utils/openLogPopup';
import { CardAttachSection } from './CardAttachSection';
import type { CardChainNode, LogCard } from '../../types/log';

interface Props {
  cardId: number;
  onClose: () => void;
}

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200',
  hold: 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-300',
  done: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200',
};
const STATUS_LABEL: Record<string, string> = { open: '진행중', hold: '보류', done: '완료' };

function hasCardLinks(content: string | null | undefined): boolean {
  if (!content) return false;
  return /data-card-id="|href="#card-/.test(content);
}

interface FlatChainCard {
  card_id: number;
  card_title: string;
  log_date: string;
  log_title: string | null;
  log_author: string | null;
  log_shift_type: string | null;
  status: string;
  depth: number;
}

function flattenChain(nodes: CardChainNode[], depth = 0, visited = new Set<number>()): FlatChainCard[] {
  const result: FlatChainCard[] = [];
  for (const node of nodes) {
    if (visited.has(node.card_id)) continue;
    visited.add(node.card_id);
    result.push({
      card_id: node.card_id,
      card_title: node.card_title,
      log_date: node.log_date,
      log_title: node.log_title,
      log_author: node.log_author,
      log_shift_type: node.log_shift_type,
      status: node.status,
      depth,
    });
    if (node.children?.length) result.push(...flattenChain(node.children, depth + 1, visited));
  }
  return result;
}

/** 체인 카드 아이템: 접힌 상태에서 클릭 시 카드 내용 로드 */
function ChainCardItem({ item }: { item: FlatChainCard }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<LogCard | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (!detail) {
      setLoading(true);
      try {
        const res = await cardApi.get(item.card_id);
        setDetail(res.data.data ?? null);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div
      className="rounded-lg border border-slate-200 overflow-hidden dark:border-slate-700"
      style={item.depth > 0 ? { marginLeft: `${item.depth * 14}px` } : undefined}
    >
      {/* 접힌 헤더 (항상 표시) */}
      <button
        onClick={toggle}
        className="w-full text-left px-3 py-2 hover:bg-slate-50 transition flex items-center gap-2 dark:hover:bg-slate-800"
      >
        <span className="text-slate-400 text-[11px] shrink-0">{expanded ? '▼' : '▶'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-slate-400 shrink-0">{item.log_date.replace(/-/g, '.')}</span>
            {item.log_shift_type && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">{item.log_shift_type}</span>
            )}
            {item.log_author && (
              <span className="text-[11px] text-slate-500 shrink-0">{item.log_author}</span>
            )}
            <span className="text-[13px] font-semibold text-slate-900 truncate dark:text-slate-100">{item.card_title}</span>
          </div>
          {item.log_title && (
            <div className="text-[11px] text-slate-400 truncate mt-0.5">{item.log_title}</div>
          )}
        </div>
                <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full font-medium ${item.status === 'done' ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200' : (STATUS_BADGE[item.status] ?? 'bg-slate-100 text-slate-500')}`}>
                  {STATUS_LABEL[item.status] ?? item.status}
                </span>
      </button>

      {/* 펼친 내용 */}
      {expanded && (
        <div className="border-t border-slate-100 px-3 py-3 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
          {loading && <div className="text-center text-[12px] text-slate-400 py-4">불러오는 중...</div>}
          {!loading && !detail && <div className="text-[12px] text-slate-400">카드를 찾을 수 없습니다</div>}
          {detail && (
            <div className="space-y-2">
              {detail.content
                ? <div className="text-[13px] text-slate-700 leading-relaxed sw-content dark:text-slate-200" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(detail.content) }} />
                : <p className="text-[12px] text-slate-400 italic dark:text-slate-500">내용 없음</p>
              }
              <CardAttachSection cardId={detail.id} canDelete={false} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CardPreviewModal({ cardId, onClose }: Props) {
  const [cardStack, setCardStack] = useState<number[]>([cardId]);
  const currentCardId = cardStack[cardStack.length - 1];
  const [card, setCard] = useState<LogCard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chainCards, setChainCards] = useState<FlatChainCard[] | null>(null);
  const [isChainLoading, setIsChainLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoading(true);
    setCard(null);
    setChainCards(null);
    cardApi.get(currentCardId)
      .then(res => setCard(res.data.data ?? null))
      .finally(() => setIsLoading(false));
  }, [currentCardId]);

  // 콘텐츠 내 카드 링크 클릭 → 스택 push
  useEffect(() => {
    const el = contentRef.current;
    if (!el || !card) return;
    const handler = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest<HTMLElement>('a[data-card-id], a[href^="#card-"], .sw-link[data-card-id]');
      if (!link) return;
      e.preventDefault();
      const raw = link.getAttribute('data-card-id')
        ?? link.getAttribute('href')?.match(/#card-(\d+)/)?.[1]
        ?? (link.getAttribute('href') === '#internal' ? link.getAttribute('data-card-id') : null);
      if (!raw) return;
      const nextCardId = Number(raw);
      if (!Number.isFinite(nextCardId) || nextCardId <= 0) return;
      setCardStack(prev => {
        const current = prev[prev.length - 1];
        if (current === nextCardId) return prev;
        const existingIndex = prev.indexOf(nextCardId);
        if (existingIndex >= 0) return prev.slice(0, existingIndex + 1);
        return [...prev, nextCardId];
      });
    };
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [card]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (chainCards !== null) setChainCards(null);
        else onClose();
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose, chainCards]);

  async function toggleChain() {
    if (chainCards !== null) { setChainCards(null); return; }
    setIsChainLoading(true);
    try {
      const res = await cardApi.getChain(currentCardId);
      const flat = flattenChain(res.data.data ?? []);
      flat.sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime());
      setChainCards(flat);
    } finally {
      setIsChainLoading(false);
    }
  }

  const canGoBack = cardStack.length > 1;

  const [dragPos, setDragPos] = useState(() => ({
    x: Math.max(0, Math.round((window.innerWidth - 560) / 2)),
    y: Math.max(0, Math.round((window.innerHeight - 600) / 2)),
  }));
  const dragPosRef = useRef(dragPos);

  const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    const startX = e.clientX - dragPosRef.current.x;
    const startY = e.clientY - dragPosRef.current.y;
    function onMove(ev: MouseEvent) {
      const x = Math.max(0, Math.min(window.innerWidth - 560, ev.clientX - startX));
      const y = Math.max(0, Math.min(window.innerHeight - 60, ev.clientY - startY));
      dragPosRef.current = { x, y };
      setDragPos({ x, y });
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  return (
    <div className="fixed inset-0 z-[400]"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ position: 'absolute', left: dragPos.x, top: dragPos.y, width: 560 }}
        className="bg-white rounded-xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden border-2 border-amber-400 dark:bg-slate-900 dark:text-slate-100 dark:border-amber-500">

        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 dark:border-slate-700 cursor-move select-none"
          onMouseDown={handleDragStart}>
          <div className="flex items-center gap-2">
            {canGoBack && (
              <button onClick={() => setCardStack(prev => prev.slice(0, -1))}
                className="text-slate-500 hover:text-slate-800 p-1 rounded hover:bg-slate-100 transition dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
            )}
            <div className="text-[15px] font-bold text-slate-800 dark:text-slate-100">카드 상세</div>
            {canGoBack && <span className="text-[11px] text-slate-400">{cardStack.length}단계</span>}
          </div>
          <div className="flex items-center gap-2">
            {card && (
              <button onClick={() => openLogPopup(card.log_id, card.id)}
                className="px-2.5 py-1 text-[12px] font-medium rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
                원래 일지 열기
              </button>
            )}
            {card && hasCardLinks(card.content) && (
              <button
                onClick={toggleChain}
                disabled={isChainLoading}
                className={`hidden px-3 py-1 text-[12px] font-medium rounded-lg border transition ${chainCards !== null ? 'bg-blue-600 text-white border-blue-600' : 'text-blue-600 border-blue-300 hover:bg-blue-50'}`}
              >
                {isChainLoading ? '...' : chainCards !== null ? '🔗 체인 닫기' : '🔗 체인 전체 보기'}
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Breadcrumb */}
        {canGoBack && (
          <div className="px-5 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1 overflow-x-auto shrink-0 dark:bg-slate-950 dark:border-slate-800">
            {cardStack.map((id, i) => (
              <span key={id} className="flex items-center gap-1 shrink-0">
                {i > 0 && <span className="text-slate-300 text-[11px]">›</span>}
                <button
                  onClick={() => setCardStack(prev => prev.slice(0, i + 1))}
                  className={`text-[11px] px-1.5 py-0.5 rounded transition ${i === cardStack.length - 1 ? 'text-blue-600 font-semibold dark:text-cyan-200' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'}`}
                >
                  카드 #{id}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* 본문 (스크롤) */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {isLoading && <div className="text-center text-[13px] text-slate-400 py-8">불러오는 중...</div>}
          {!isLoading && !card && <div className="text-center text-[13px] text-slate-400 py-8">카드를 찾을 수 없습니다</div>}
          {card && (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${STATUS_BADGE[card.status] ?? 'bg-slate-100 text-slate-500'}`}>
                  {STATUS_LABEL[card.status] ?? card.status}
                </span>
                {card.category_name && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: card.category_color ? `${card.category_color}22` : '#f1f5f9', color: card.category_color ?? '#64748b' }}>
                    {card.category_name}
                  </span>
                )}
                <span className="font-semibold text-slate-900 text-[15px] dark:text-slate-100">{card.title}</span>
              </div>
              {card.content
                ? <div ref={contentRef} className="text-[14px] text-slate-700 leading-relaxed sw-content dark:text-slate-200" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(card.content) }} />
                : <p className="text-[14px] text-slate-400 italic dark:text-slate-500">내용 없음</p>
              }
              <CardAttachSection cardId={card.id} canDelete={false} />

              {/* 인라인 체인 — 접힌 아코디언 */}
              {chainCards !== null && (
                <div className="border-t border-slate-200 pt-4 space-y-1.5 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[12px] font-semibold text-slate-500">
                      🔗 연결 체인 ({chainCards.length}건 · 시간순) — 클릭하여 내용 보기
                    </div>
                    <button
                      onClick={() => setChainCards(null)}
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded hover:bg-slate-100 transition"
                      title="체인 닫기 (ESC)"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                  {chainCards.length === 0
                    ? <p className="text-[13px] text-slate-400 text-center py-4">연결된 카드가 없습니다</p>
                    : chainCards.map((c, idx) => (
                        <div key={`${c.card_id}-${idx}`}>
                          {idx > 0 && c.depth === 0 && (
                            <div className="text-center text-slate-300 text-[11px] my-1">↓</div>
                          )}
                          <ChainCardItem item={c} />
                        </div>
                      ))
                  }
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
