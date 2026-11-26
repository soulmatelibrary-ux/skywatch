import { useEffect, useState } from 'react';
import { cardApi } from '../../services/api/logApi';
import type { CardChainNode } from '../../types/log';

interface Props {
  cardId: number;
  cardTitle: string;
  onClose: () => void;
  onCardClick?: (logId: number, cardId: number) => void;
  zIndex?: number;
}

type ViewMode = 'single' | 'chain';

interface FlatCard extends CardChainNode {
  depth: number;
  isCurrentCard: boolean;
}

export function CardLinkChainModal({ cardId, cardTitle, onClose, onCardClick, zIndex = 60 }: Props) {
  const [mode, setMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('cardChainViewMode');
    return (saved as ViewMode) || 'chain';
  });
  const [chain, setChain] = useState<CardChainNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('cardChainViewMode', mode);
  }, [mode]);

  useEffect(() => {
    const loadChain = async () => {
      try {
        setLoading(true);
        const res = await cardApi.getChain(cardId);
        setChain(res.data.data ?? []);
        setError(null);
      } catch (err) {
        setError('연결 체인을 불러올 수 없습니다');
      } finally {
        setLoading(false);
      }
    };
    loadChain();
  }, [cardId]);

  const flattenChain = (nodes: CardChainNode[], depth = 0, seen = new Set<number>()): FlatCard[] => {
    const result: FlatCard[] = [];
    for (const node of nodes) {
      const isDuplicate = seen.has(node.card_id);
      result.push({
        ...node,
        depth,
        isCurrentCard: node.card_id === cardId,
      });
      if (!isDuplicate && node.children && node.children.length > 0 && depth < 3) {
        seen.add(node.card_id);
        result.push(...flattenChain(node.children, depth + 1, seen));
      }
    }
    return result;
  };

  const sortedChain = mode === 'chain'
    ? [...chain].sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime())
    : chain;

  const flatCards = mode === 'chain'
    ? flattenChain(sortedChain)
    : sortedChain.map(c => ({ ...c, depth: 0, isCurrentCard: c.card_id === cardId }));

  const formatDate = (date: string) => date.replace(/-/g, '.');

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      done: { color: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200', label: '✅ 완료' },
      open: { color: 'bg-red-100 text-red-700', label: '⚠️ 진행' },
      hold: { color: 'bg-amber-100 text-amber-700', label: '⏸ 보류' },
    };
    const badge = badges[status] || badges.open;
    return badge;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center" style={{ zIndex }}>
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full mx-4 dark:bg-slate-900 dark:text-slate-100 dark:border dark:border-slate-700">
          <div className="text-center text-slate-500">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center" style={{ zIndex }} onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col dark:bg-slate-900 dark:text-slate-100 dark:border dark:border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex-1">
            <h2 className="text-[18px] font-bold text-slate-900">🔗 연결 체인</h2>
            <p className="text-[13px] text-slate-500 mt-1">{cardTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode('single')}
              className={`px-3 py-1.5 text-[13px] font-medium rounded-lg transition ${
                mode === 'single'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-cyan-500/15 dark:text-cyan-200 dark:border-cyan-400/30'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700'
              }`}
            >
              📄 단일 카드
            </button>
            <button
              onClick={() => setMode('chain')}
              className={`px-3 py-1.5 text-[13px] font-medium rounded-lg transition ${
                mode === 'chain'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-cyan-500/15 dark:text-cyan-200 dark:border-cyan-400/30'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700'
              }`}
            >
              🔗 체인 전체
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none transition"
          >
            ×
          </button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

          {flatCards.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <div className="text-3xl mb-2">🔗</div>
              <div className="text-[14px]">연결된 카드가 없습니다</div>
            </div>
          ) : (
            <>
              {flatCards.map((card, idx) => {
                const statusBadge = getStatusBadge(card.status);
                const isDuplicate = flatCards.slice(0, idx).some(c => c.card_id === card.card_id && c.depth <= card.depth);

                return (
                  <div key={`${card.card_id}-${idx}`} className={card.depth > 0 ? 'ml-6' : ''}>
                    {/* 연결선 */}
                    {idx > 0 && card.depth > 0 && (
                      <div className="text-slate-300 text-center text-[12px] font-medium mb-2">↓</div>
                    )}

                    {/* 카드 */}
                    <button
                      onClick={() => onCardClick?.(card.log_id, card.card_id)}
                      className={`w-full text-left p-4 rounded-lg border transition ${
                        card.isCurrentCard
                          ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200 dark:bg-cyan-500/10 dark:border-cyan-400/40 dark:ring-cyan-400/20'
                          : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:border-slate-600'
                      } ${isDuplicate ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[12px] font-medium text-slate-500">[{formatDate(card.log_date)}]</span>
                            {card.log_title && (
                              <span className="text-[12px] text-slate-600">{card.log_title}</span>
                            )}
                            <span className="text-[12px] text-slate-500">›</span>
                            <span className="text-[13px] font-semibold text-slate-900">{card.card_title}</span>
                            {isDuplicate && (
                              <span className="text-[11px] px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded">
                                순환 감지
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded font-medium shrink-0 ${statusBadge.color} border border-current border-opacity-30`}
                        >
                          {statusBadge.label}
                        </span>
                      </div>
                      {card.isCurrentCard && (
                        <div className="text-[11px] text-blue-600 font-medium">← 현재 카드</div>
                      )}
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
