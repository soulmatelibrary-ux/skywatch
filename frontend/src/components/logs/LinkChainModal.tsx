// 연결 체인 카드 목록 모달 — 최근 일지 우선, 리사이즈 가능, 카드 상세 보기
import { useEffect, useState } from 'react';
import { cardApi } from '../../services/api/logApi';
import { cardStatusesApi } from '../../services/api/cardStatusesApi';
import { useDraggableResizable } from '../../hooks/useDraggableResizable';
import { useUIStore } from '../../store/uiStore';
import { CardAttachSection } from './CardAttachSection';
import { CardContentView } from './CardContentView';
import { CardPreviewModal } from './CardPreviewModal';
import { LinkSearchModal } from './LinkSearchModal';
import { LogDetailModal } from './LogDetailModal';
import type { CardChainNode, CardLinkResult, LogCard } from '../../types/log';
import type { CardStatusItem } from '../../types/log';

const INITIAL_SIZE = { width: 1100, height: 760 };
const STORAGE_KEY = 'sw-chain-modal-size';

function CardDetailPanel({
  cardDetail,
  selectedNode,
  statusObj,
  onLinkClick,
}: {
  cardDetail: LogCard;
  selectedNode: CardChainNode | undefined;
  statusObj: CardStatusItem | undefined;
  onLinkClick?: (cardId: number) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-1">
          <h2 className="text-[16px] font-bold text-slate-800 dark:text-slate-100">{cardDetail.title}</h2>
          <div className="text-[12px] text-slate-400 mt-0.5">
            {selectedNode?.log_date ?? ''}
            {selectedNode?.log_shift_type ? ` · ${selectedNode.log_shift_type}` : ''}
            {selectedNode?.log_author ? ` · ${selectedNode.log_author}` : ''}
          </div>
        </div>
        {statusObj && (
          <span
            className="text-[12px] px-2.5 py-1 rounded-full font-semibold shrink-0"
            style={{ backgroundColor: (statusObj.color ?? '') + '22', color: statusObj.color ?? '#64748b' }}
          >
            {statusObj.label}
          </span>
        )}
      </div>
      <div className="border border-slate-200 rounded-lg p-4 bg-white mb-4 dark:border-slate-700 dark:bg-slate-950">
        {cardDetail.content
          ? <CardContentView html={cardDetail.content} onLinkClick={onLinkClick} />
          : <p className="text-[13px] text-slate-400 italic dark:text-slate-500">내용 없음</p>
        }
      </div>
      <CardAttachSection cardId={cardDetail.id} canDelete={false} />
    </div>
  );
}

function flattenTree(nodes: CardChainNode[]): CardChainNode[] {
  const result: CardChainNode[] = [];
  function walk(node: CardChainNode) {
    result.push(node);
    node.children.forEach(walk);
  }
  nodes.forEach(walk);
  return result;
}

interface Props {
  cardId: number;
  cardTitle: string;
  onClose: () => void;
  onChainUpdated?: () => void;
  isFullPage?: boolean;
}

interface CompleteConfirm {
  nodeCardId: number;
  cardTitle: string;
  remainCount: number;
}

interface UnlinkConfirm {
  nodeCardId: number;
  cardTitle: string;
}

export function LinkChainModal({ cardId, cardTitle, onClose, onChainUpdated, isFullPage = false }: Props) {
  const [flatNodes, setFlatNodes] = useState<CardChainNode[]>([]);
  const [statuses, setStatuses] = useState<CardStatusItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  // 카드별 select에서 선택한 임시 상태값
  const [pendingStatus, setPendingStatus] = useState<Record<number, string>>({});
  const [completeConfirm, setCompleteConfirm] = useState<CompleteConfirm | null>(null);

  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [cardDetail, setCardDetail] = useState<LogCard | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [linkedCardId, setLinkedCardId] = useState<number | null>(null);

  const [detailLogId, setDetailLogId] = useState<number | null>(null);
  const [unlinkingCardId, setUnlinkingCardId] = useState<number | null>(null);
  const [unlinkConfirm, setUnlinkConfirm] = useState<UnlinkConfirm | null>(null);
  const [addLinkOpen, setAddLinkOpen] = useState(false);

  const { addToast } = useUIStore();
  const { pos, size, onDragStart, onResizeStart } = useDraggableResizable(INITIAL_SIZE, STORAGE_KEY);

  const loadChain = () => {
    setIsLoading(true);
    cardApi.getChain(cardId)
      .then(res => {
        const tree = res.data.data ?? [];
        const flat = flattenTree(tree);
        flat.sort((a, b) => b.log_date.localeCompare(a.log_date));
        setFlatNodes(flat);
        setPendingStatus(Object.fromEntries(flat.map(n => [n.card_id, n.status])));
      })
      .catch(() => {
        setFlatNodes([]);
        addToast('체인을 불러오지 못했습니다.', 'error');
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadChain();
    cardStatusesApi.list().then(res => setStatuses(res.data.data ?? []));
  }, [cardId]);

  useEffect(() => {
    if (flatNodes.length > 0 && selectedCardId === null) {
      setSelectedCardId(flatNodes[0].card_id);
    }
  }, [flatNodes]);

  useEffect(() => {
    if (selectedCardId === null) { setCardDetail(null); return; }
    let isCurrent = true;
    setIsDetailLoading(true);
    setCardDetail(null);
    cardApi.get(selectedCardId)
      .then(res => { if (isCurrent) setCardDetail(res.data.data ?? null); })
      .finally(() => { if (isCurrent) setIsDetailLoading(false); });
    return () => { isCurrent = false; };
  }, [selectedCardId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const refreshDetail = (cardIdToRefresh: number) => {
    cardApi.get(cardIdToRefresh).then(res => setCardDetail(res.data.data ?? null));
  };

  const handleStatusChange = async (nodeCardId: number, newStatus: string) => {
    // 가장 최근 카드(목록 첫 번째)를 완료로 변경할 때 → 체인 전체 완료 여부 확인
    if (newStatus === 'done' && flatNodes.length > 0 && nodeCardId === flatNodes[0].card_id) {
      const notDone = flatNodes.filter(n => n.status !== 'done' && n.card_id !== nodeCardId);
      if (notDone.length > 0) {
        setCompleteConfirm({
          nodeCardId,
          cardTitle: flatNodes[0].card_title,
          remainCount: notDone.length,
        });
        return;
      }
    }
    await applyStatusChange(nodeCardId, newStatus);
  };

  const applyStatusChange = async (nodeCardId: number, newStatus: string, completeAll = false) => {
    try {
      setIsUpdating(true);
      if (completeAll) {
        await cardApi.completeChain(nodeCardId);
        addToast('체인 전체가 완료 처리되었습니다.', 'success');
      } else {
        await cardApi.updateStatus(nodeCardId, newStatus);
        addToast('상태가 변경되었습니다.', 'success');
      }
      loadChain();
      if (selectedCardId !== null) refreshDetail(selectedCardId);
      onChainUpdated?.();
    } catch {
      // 실패 시 pendingStatus를 서버 실제값으로 롤백
      setPendingStatus(Object.fromEntries(flatNodes.map(n => [n.card_id, n.status])));
      addToast('상태 변경에 실패했습니다.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUnlink = (nodeCardId: number, nodeCardTitle: string) => {
    setUnlinkConfirm({ nodeCardId, cardTitle: nodeCardTitle });
  };

  const confirmUnlink = async () => {
    if (!unlinkConfirm) return;
    const { nodeCardId } = unlinkConfirm;
    setUnlinkConfirm(null);
    setUnlinkingCardId(nodeCardId);
    try {
      await cardApi.unlinkFromChain(nodeCardId);
      addToast('체인 연결이 해제되었습니다. 원본 카드는 유지됩니다.', 'success');
      if (selectedCardId === nodeCardId) setSelectedCardId(null);
      const newNodes = flatNodes.filter(n => n.card_id !== nodeCardId);
      if (newNodes.length < 2) {
        onChainUpdated?.();
        onClose();
        return;
      }
      loadChain();
      onChainUpdated?.();
    } catch {
      addToast('체인 해제에 실패했습니다.', 'error');
    } finally {
      setUnlinkingCardId(null);
    }
  };

  const handleAddLink = async (item: CardLinkResult) => {
    try {
      await cardApi.linkToChain(cardId, item.card_id);
      addToast(`"${item.card_title}" 카드가 체인에 추가되었습니다.`, 'success');
      setAddLinkOpen(false);
      loadChain();
      onChainUpdated?.();
    } catch {
      addToast('카드 추가에 실패했습니다.', 'error');
    }
  };

  const subDialogs = (
    <>
      {/* 체인 전체 완료 확인 다이얼로그 */}
      {completeConfirm && (
        <div className="fixed inset-0 z-[420] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[400px] dark:bg-slate-900 dark:text-slate-100 dark:border dark:border-slate-700">
            <div className="text-[15px] font-bold text-slate-800 mb-2 dark:text-slate-100">체인 전체 완료 처리</div>
            <p className="text-[13px] text-slate-600 leading-relaxed mb-1 dark:text-slate-300">
              <span className="font-semibold text-slate-800">"{completeConfirm.cardTitle}"</span>을 완료 처리합니다.
            </p>
            <p className="text-[13px] text-slate-600 leading-relaxed mb-5">
              연결된 나머지 카드 <span className="font-semibold text-blue-600">{completeConfirm.remainCount}개</span>도 모두 완료 처리할까요?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setCompleteConfirm(null); applyStatusChange(completeConfirm.nodeCardId, 'done', false); }}
                className="px-4 py-2 text-[13px] border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                이 카드만 완료
              </button>
              <button
                onClick={() => { setCompleteConfirm(null); applyStatusChange(completeConfirm.nodeCardId, 'done', true); }}
                        className="shrink-0 text-[12px] px-2.5 py-1.5 border border-blue-200 rounded-md bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-500 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-200 dark:hover:bg-blue-500/25"
              >
                전체 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {unlinkConfirm && (
        <div className="fixed inset-0 z-[420] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[400px] dark:bg-slate-900 dark:text-slate-100 dark:border dark:border-slate-700">
            <div className="text-[15px] font-bold text-slate-800 mb-2 dark:text-slate-100">체인 연결 해제</div>
            <p className="text-[13px] text-slate-600 leading-relaxed mb-1 dark:text-slate-300">
              <span className="font-semibold text-slate-800 dark:text-slate-100">"{unlinkConfirm.cardTitle}"</span> 카드를 체인에서 해제합니다.
            </p>
            <p className="text-[13px] text-slate-500 leading-relaxed mb-5 dark:text-slate-400">
              연결 링크만 제거되며 원본 카드와 내용은 유지됩니다.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setUnlinkConfirm(null)}
                className="px-4 py-2 text-[13px] border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                취소
              </button>
              <button
                onClick={confirmUnlink}
                className="px-4 py-2 text-[13px] rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition"
              >
                해제
              </button>
            </div>
          </div>
        </div>
      )}

      {detailLogId !== null && (
        <LogDetailModal
          logId={detailLogId}
          onClose={() => setDetailLogId(null)}
        />
      )}

      {linkedCardId !== null && (
        <CardPreviewModal
          cardId={linkedCardId}
          onClose={() => setLinkedCardId(null)}
        />
      )}

      {addLinkOpen && (
        <LinkSearchModal
          onSelect={handleAddLink}
          onClose={() => setAddLinkOpen(false)}
          targetCardLabel={cardTitle}
          excludeCardId={cardId}
        />
      )}

  </>
);

  const panelBody = (
    <div className="flex flex-1 min-h-0">
      {/* 좌측: 카드 목록 */}
      <div className="w-[380px] shrink-0 border-r border-slate-200 flex flex-col overflow-hidden dark:border-slate-700">
        <div className="px-4 py-2 border-b border-slate-100 text-[12px] text-slate-500 font-medium shrink-0 dark:border-slate-700 dark:text-slate-400">
          카드 목록 {flatNodes.length > 0 && <span className="text-slate-400">({flatNodes.length}개)</span>}
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
          {isLoading && (
            <div className="text-center text-[13px] text-slate-400 py-8">불러오는 중...</div>
          )}
          {!isLoading && flatNodes.length === 0 && (
            <div className="text-center text-[13px] text-slate-400 py-8">연결된 카드가 없습니다</div>
          )}
          {!isLoading && flatNodes.map((node, idx) => {
            const isSelected = node.card_id === selectedCardId;
            const current = pendingStatus[node.card_id] ?? node.status;
            const isDirty = current !== node.status;
            const isRecent = idx === 0;
            return (
              <div
                key={node.card_id}
                onClick={() => setSelectedCardId(node.card_id)}
                className={`group px-3 py-2.5 rounded-lg border cursor-pointer transition ${
                  isSelected
                    ? 'border-blue-300 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {isRecent && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 font-semibold shrink-0">최근</span>
                      )}
                      <span className="text-[13px] font-bold text-slate-800 truncate dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{node.card_title}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {node.log_date}{node.log_shift_type ? ` · ${node.log_shift_type}` : ''}{node.log_author ? ` · ${node.log_author}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setDetailLogId(node.log_id)}
                      className="text-[11px] px-2 py-1 border border-slate-300 rounded-md text-slate-600 hover:bg-slate-100 transition dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                      title="일지 상세 보기"
                    >
                      📄 일지
                    </button>
                    <button
                      onClick={() => handleUnlink(node.card_id, node.card_title)}
                      disabled={unlinkingCardId !== null || isUpdating}
                      className="text-[11px] px-2 py-1 border border-red-200 rounded-md text-red-500 hover:bg-red-50 transition disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
                      title="이 카드를 체인에서 해제"
                    >
                      {unlinkingCardId === node.card_id ? '해제 중...' : '해제'}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
                  <select
                    value={current}
                    onChange={e => setPendingStatus(prev => ({ ...prev, [node.card_id]: e.target.value }))}
                    className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-blue-400"
                  >
                    {statuses.map(st => (
                      <option key={st.key} value={st.key}>{st.label}</option>
                    ))}
                  </select>
                  <button
                    disabled={!isDirty || isUpdating}
                    onClick={() => handleStatusChange(node.card_id, current)}
                    className={`px-3 py-1 text-[12px] rounded-md font-medium transition shrink-0 ${
                      isDirty
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-slate-300 text-slate-600 cursor-not-allowed dark:bg-slate-700 dark:text-slate-300 dark:border dark:border-slate-600'
                    }`}
                  >
                    저장
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 우측: 카드 상세 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedCardId && (
          <div className="flex-1 flex items-center justify-center text-[13px] text-slate-400">
            카드를 선택하면 내용이 표시됩니다
          </div>
        )}
        {selectedCardId && isDetailLoading && (
          <div className="flex-1 flex items-center justify-center text-[13px] text-slate-400">
            불러오는 중...
          </div>
        )}
        {selectedCardId && !isDetailLoading && cardDetail && (
          <CardDetailPanel
            cardDetail={cardDetail}
            selectedNode={flatNodes.find(n => n.card_id === selectedCardId)}
            statusObj={statuses.find(s => s.key === flatNodes.find(n => n.card_id === selectedCardId)?.status)}
            onLinkClick={setLinkedCardId}
          />
        )}
      </div>
    </div>
  );

  const headerBar = (
    <div
      className={`px-6 py-1 border-b border-blue-200 bg-blue-50 flex items-center justify-between shrink-0 select-none dark:border-slate-700 dark:bg-slate-800${isFullPage ? '' : ' cursor-move'}`}
      onMouseDown={isFullPage ? undefined : onDragStart}
    >
      <div>
        <div className="text-[15px] font-bold text-slate-900 dark:text-slate-100">연결 체인 보기</div>
        <div className="text-[12px] text-slate-500 mt-0.5 truncate max-w-[600px] dark:text-slate-400">{cardTitle}</div>
      </div>
      <div className="flex items-center gap-2" onMouseDown={e => e.stopPropagation()}>
        <button
          onClick={() => setAddLinkOpen(true)}
          className="px-3 py-1.5 text-[12px] border border-blue-300 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition font-medium dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/25"
        >
          + 새 카드 추가
        </button>
        <button
          onClick={onClose}
          className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition dark:text-blue-400 dark:hover:text-blue-200 dark:hover:bg-slate-700"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  );

  if (isFullPage) {
    return (
      <div className="h-screen flex flex-col bg-white dark:bg-slate-900 dark:text-slate-100">
        {subDialogs}
        {headerBar}
        {panelBody}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[400] bg-slate-900/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {subDialogs}
      <div
        className="absolute bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden dark:bg-slate-900 dark:text-slate-100 dark:border dark:border-slate-700"
        style={{ left: pos.x, top: pos.y, width: size.width, height: size.height }}
      >
        {headerBar}
        {panelBody}
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
