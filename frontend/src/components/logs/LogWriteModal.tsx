// 일지 작성/수정 모달 — LogDetailHeader 스타일 오렌지 헤더 + 단일 컬럼 레이아웃
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLogWrite } from '../../hooks/useLogWrite';
import { useCategories } from '../../hooks/useCategories';
import { useCardStatuses } from '../../hooks/useCardStatuses';
import { useDraggableResizable } from '../../hooks/useDraggableResizable';
import { useComments } from '../../hooks/useComments';
import { useWorkerData } from '../../hooks/useWorkerData';
import { logApi } from '../../services/api/logApi';
import { attachmentApi } from '../../services/api/attachmentApi';
import { usersApi } from '../../services/api/usersApi';
import type { UserSimple } from '../../services/api/usersApi';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { PasswordConfirmModal } from './PasswordConfirmModal';
import { CardToolbar } from './CardToolbar';
import { CardLinkChainModal } from './CardLinkChainModal';
import { LinkViewDialog } from './LinkViewDialog';
import { LogDetailComments } from './LogDetailComments';
import { LogReferencePanelPopup } from './LogReferencePanelPopup';
import { LogCardList } from './LogCardList';
import { LogWriteHeader } from './LogWriteHeader';
import { LogWriteMeta } from './LogWriteMeta';
import { ReadStatusPanel } from './ReadStatusPanel';
import { ToastContainer } from '../common/Toast';
import type { LogDetail, ReadStatus } from '../../types/log';
import type { Editor } from '@tiptap/core';

const LOG_WRITE_MODAL_SIZE = { width: 1200, height: 820 };
const SUMMARY_MIN_LENGTH = 10;
const SUMMARY_MAX_LENGTH = 20;

interface Props {
  editTarget?: LogDetail | null;
  logId?: number | null;
  onClose: () => void;
  onSaved: (log: LogDetail) => void;
  onDeleted?: () => void;
  isFullPage?: boolean;
}

export function LogWriteModal({ editTarget, logId = null, onClose, onSaved, onDeleted, isFullPage = false }: Props) {
  const [loadedEditTarget, setLoadedEditTarget] = useState<LogDetail | null>(editTarget ?? null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const resolvedEditTarget = editTarget ?? loadedEditTarget;

  const [isEditMode, setIsEditMode] = useState(true);

  const { categories } = useCategories();
  const statuses = useCardStatuses();
  const {
    date, setDate, shiftType, setShiftType,
    tags, setTags,
    cards, addCard, removeCard, updateCard, moveCard,
    repCardKey, setRepCardKey,
    participants, setParticipants,
    isSubmitting, error, submit, saveDraft,
  } = useLogWrite(resolvedEditTarget);

  const { pos, size, onDragStart, onResizeStart } = useDraggableResizable(LOG_WRITE_MODAL_SIZE, isFullPage ? undefined : 'sw-modal-write-v2-size');
  const currentUser = useAuthStore(s => s.currentUser);
  const addToast = useUIStore(s => s.addToast);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [readStatus, setReadStatus] = useState<ReadStatus | null>(null);
  const [readPanelOpen, setReadPanelOpen] = useState(false);
  const [activeNonAdminUsers, setActiveNonAdminUsers] = useState<UserSimple[]>([]);
  const [chainModal, setChainModal] = useState<{ cardId: number; cardTitle: string } | null>(null);
  const [linkViewModal, setLinkViewModal] = useState<{ cardId: number; cardTitle: string } | null>(null);
  const [showReferencePanel, setShowReferencePanel] = useState(false);
  const [tagsInput, setTagsInput] = useState('');

  const [activeCardKey, setActiveCardKey] = useState<string | null>(null);
  const editorRefs = useRef<Map<string, Editor | null>>(new Map());
  const savedOkRef = useRef(false);
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const activeCardIdx = activeCardKey ? cards.findIndex(c => c._key === activeCardKey) : -1;
  const [pendingFilesMap, setPendingFilesMap] = useState<Record<string, File[]>>({});
  const [pendingImageCountMap, setPendingImageCountMap] = useState<Record<string, number>>({});
  const resolvedLogId = resolvedEditTarget?.id ?? logId ?? null;

  const {
    comments, replyToName, isSubmitting: commentSubmitting,
    submit: submitCommentBase, deleteComment: deleteCommentBase, toggleReaction, startReply, cancelReply,
  } = useComments(resolvedLogId);

  const { dutyUserIds, sortedUsers, isLoading: isLoadingWorkers } = useWorkerData(date, shiftType);

  const selectableUsers = useMemo(() => {
    const merged = new Map(sortedUsers.map(user => [user.id, user]));
    if (resolvedEditTarget) {
      const fallbackTeam = resolvedEditTarget.team ?? 'day';
      if (resolvedEditTarget.author_id && !merged.has(resolvedEditTarget.author_id)) {
        merged.set(resolvedEditTarget.author_id, {
          id: resolvedEditTarget.author_id,
          name: resolvedEditTarget.author_name ?? `#${resolvedEditTarget.author_id}`,
          team: fallbackTeam,
        });
      }
      resolvedEditTarget.participants.forEach(participant => {
        if (merged.has(participant.user_id)) return;
        merged.set(participant.user_id, {
          id: participant.user_id,
          name: participant.name ?? `#${participant.user_id}`,
          team: fallbackTeam,
        });
      });
    }
    return Array.from(merged.values());
  }, [sortedUsers, resolvedEditTarget]);

  const primaryParticipant = participants.find(p => p.role === 'primary');
  const additionalParticipants = participants.filter(p => p.role !== 'primary');
  const inputsDisabled = !!resolvedEditTarget && !isEditMode;
  const isNewLogWriteMode = !resolvedEditTarget && !logId && isEditMode;
  const savingText = isLoadingDetail ? '일지 로드 중...' : isSubmitting ? '저장 중...' : undefined;

  const primaryUser = selectableUsers.find(u => u.id === primaryParticipant?.user_id);
  const teamLabel = primaryUser ? (primaryUser.team === 'day' ? '주간' : `${primaryUser.team}조`) : '';
  const repTitle = cards.find(c => c._key === repCardKey)?.title ?? '';

  function notifyLogsReload() {
    const ch = new BroadcastChannel('skywatch-log');
    ch.postMessage({ type: 'logs-reload' });
    ch.close();
  }

  function parseTagsInput(raw: string): string[] {
    return Array.from(new Set(raw.split(',').map(t => t.trim()).filter(Boolean)));
  }

  function validateSummaryTags(values: string[]): boolean {
    const invalid = values.find(v => v.length < SUMMARY_MIN_LENGTH || v.length > SUMMARY_MAX_LENGTH);
    if (!invalid) return true;
    addToast(`요약/키워드는 항목별 ${SUMMARY_MIN_LENGTH}~${SUMMARY_MAX_LENGTH}자로 입력해 주세요.`, 'warning');
    return false;
  }

  function commitTagsInput(raw: string): string[] {
    const parsed = parseTagsInput(raw);
    setTags(parsed);
    setTagsInput(parsed.join(', '));
    return parsed;
  }

  async function submitComment(body: string) { await submitCommentBase(body); notifyLogsReload(); }
  async function deleteComment(commentId: number) { await deleteCommentBase(commentId); notifyLogsReload(); }

  useEffect(() => {
    if (resolvedEditTarget || isLoadingWorkers || sortedUsers.length === 0) return;
    const firstDutyUser = sortedUsers.find(u => dutyUserIds.has(u.id));
    if (firstDutyUser) { setParticipants([{ user_id: firstDutyUser.id, role: 'primary' }]); return; }
    if (currentUser) setParticipants([{ user_id: currentUser.id, role: 'primary' }]);
  }, [resolvedEditTarget, isLoadingWorkers, date, shiftType, sortedUsers, dutyUserIds, currentUser, setParticipants]);

  useEffect(() => {
    if (editTarget) { setLoadedEditTarget(editTarget); setReadPanelOpen(true); setIsEditMode(true); return; }
    if (!logId) { setLoadedEditTarget(null); setIsEditMode(true); return; }
    let cancelled = false;
    setIsLoadingDetail(true);
    logApi.get(logId)
      .then(res => { if (!cancelled) { setLoadedEditTarget(res.data.data ?? null); setReadPanelOpen(true); setIsEditMode(true); } })
      .catch(() => { if (!cancelled) addToast('일지 상세를 불러오지 못했습니다.', 'error'); })
      .finally(() => { if (!cancelled) setIsLoadingDetail(false); });
    return () => { cancelled = true; };
  }, [editTarget, logId, addToast]);

  useEffect(() => {
    if (!resolvedLogId) return;
    logApi.ack(resolvedLogId).catch(() => {});
  }, [resolvedLogId]);

  useEffect(() => {
    usersApi.list().then(res => {
      setActiveNonAdminUsers(
        (res.data.data ?? []).filter(u => u.is_active && u.role !== 'admin')
      );
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!resolvedEditTarget || !resolvedLogId) return;
    logApi.getReads(resolvedLogId)
      .then(res => setReadStatus(res.data.data ?? null))
      .catch(() => addToast('읽음 현황을 불러오지 못했습니다.', 'error'));
  }, [resolvedLogId, addToast]);

  useEffect(() => {
    if (cards.length > 0) setActiveCardKey(prev => prev ?? cards[0]._key);
  }, [cards]);

  useEffect(() => { setTagsInput((tags ?? []).join(', ')); }, [tags]);

  useEffect(() => {
    if (isNewLogWriteMode) return;
    if (chainModal || linkViewModal || showDeleteConfirm) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isNewLogWriteMode, chainModal, linkViewModal, showDeleteConfirm, onClose]);

  useEffect(() => {
    if (!isEditMode || cards.every(c => !c.title.trim() && !c.content?.trim())) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (savedOkRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isEditMode, cards]);

  useEffect(() => {
    setActiveEditor(activeCardKey ? (editorRefs.current.get(activeCardKey) ?? null) : null);
  }, [activeCardKey, cards]);

  function handleEditorReady(key: string, editor: Editor | null) {
    if (editor) editorRefs.current.set(key, editor); else editorRefs.current.delete(key);
    if (key === activeCardKey) setActiveEditor(editor);
  }

  function addPendingFiles(key: string, files: File[]) {
    setPendingFilesMap(prev => ({ ...prev, [key]: [...(prev[key] ?? []), ...files] }));
  }

  function removePendingFile(key: string, index: number) {
    setPendingFilesMap(prev => ({ ...prev, [key]: (prev[key] ?? []).filter((_, i) => i !== index) }));
  }

  function setPendingImageCount(key: string, count: number) {
    setPendingImageCountMap(prev => ({ ...prev, [key]: count }));
  }

  function handleRemoveCard(key: string) {
    removeCard(key);
    setPendingFilesMap(prev => { const next = { ...prev }; delete next[key]; return next; });
    setPendingImageCountMap(prev => { const next = { ...prev }; delete next[key]; return next; });
  }

  const isCrossAccount = !!(resolvedEditTarget && currentUser && resolvedEditTarget.author_id !== currentUser.id);
  const pendingImageCount = Object.values(pendingImageCountMap).reduce((sum, count) => sum + count, 0);

  async function handleToggleReadPanel() {
    if (!resolvedLogId) return;
    if (readPanelOpen) { setReadPanelOpen(false); return; }
    try {
      const res = await logApi.getReads(resolvedLogId);
      setReadStatus(res.data.data ?? null);
      setReadPanelOpen(true);
    } catch { addToast('읽음 현황을 불러오지 못했습니다.', 'error'); }
  }

  async function doSubmit(tagsOverride?: string[]) {
    let result: LogDetail | null;
    try { result = await submit(tagsOverride); } catch (e: any) {
      if (e?.response?.status === 409) {
        if (resolvedEditTarget) {
          addToast('다른 사용자가 이미 수정했습니다. 최신 버전을 다시 불러옵니다.', 'warning');
          try {
            const refreshed = (await logApi.get(resolvedEditTarget.id)).data.data ?? null;
            if (refreshed) setLoadedEditTarget(refreshed);
          } catch {
            addToast('최신 버전 로드에 실패했습니다.', 'error');
          }
          setIsEditMode(false);
        } else {
          addToast(e?.response?.data?.detail ?? '이미 해당 날짜/근무유형의 일지가 존재합니다.', 'warning');
        }
        return;
      }
      addToast(e?.response?.data?.detail ?? '저장에 실패했습니다.', 'error'); return;
    }
    if (!result) return;
    const uploadTasks: Promise<void>[] = [];
    for (const savedCard of result.cards) {
      const writeCard = cards.find(c => c.id === savedCard.id || (!c.id && c.position === savedCard.position));
      if (!writeCard) continue;
      for (const file of pendingFilesMap[writeCard._key] ?? []) {
        uploadTasks.push(attachmentApi.upload('card', savedCard.id, file).then(() => {}).catch(() => {}));
      }
    }
    let finalResult = result;
    if (uploadTasks.length > 0) {
      const uploadResults = await Promise.allSettled(uploadTasks);
      const failed = uploadResults.filter(r => r.status === 'rejected').length;
      if (failed > 0) addToast(`${failed}개 파일 업로드 실패`, 'warning');
      try { finalResult = (await logApi.get(result.id)).data.data ?? result; } catch { /* use original */ }
    }
    setLoadedEditTarget(finalResult);
    setPendingFilesMap({});
    if (!resolvedEditTarget) setIsEditMode(false);
    addToast(resolvedEditTarget ? '일지가 수정되었습니다.' : '일지가 저장되었습니다.', 'success');
    if (isCrossAccount) addToast('작성자에게 수정 알림이 전송되었습니다.', 'info');
    savedOkRef.current = true;
    onSaved(finalResult);
  }

  function handleSubmit() {
    const parsedTags = commitTagsInput(tagsInput);
    if (!validateSummaryTags(parsedTags)) return;
    doSubmit(parsedTags);
  }

  async function doDelete() {
    if (!resolvedLogId) return;
    try {
      await logApi.delete(resolvedLogId);
      addToast('일지가 삭제되었습니다', 'success');
      savedOkRef.current = true;
      onDeleted?.();
      setTimeout(() => onClose(), 800);
    } catch { addToast('삭제에 실패했습니다', 'error'); }
  }

  function updatePrimaryWorker(userId: number) {
    const remaining = additionalParticipants
      .filter(p => p.user_id !== userId)
      .map(p => ({ ...p, role: 'sub' }));
    setParticipants([{ user_id: userId, role: 'primary' }, ...remaining]);
  }

  return (
    <>
      {chainModal && (
        <CardLinkChainModal
          cardId={chainModal.cardId} cardTitle={chainModal.cardTitle}
          onClose={() => setChainModal(null)}
          onCardClick={() => { setChainModal(null); onClose(); }}
        />
      )}
      {linkViewModal && (
        <LinkViewDialog
          cardId={linkViewModal.cardId} cardTitle={linkViewModal.cardTitle}
          onClose={() => setLinkViewModal(null)}
        />
      )}
      {showDeleteConfirm && (
        <PasswordConfirmModal
          authorName={resolvedEditTarget?.author_name ?? '작성자'}
          warningMessage="삭제하면 복구할 수 없습니다."
          confirmLabel="확인 후 삭제"
          onConfirmed={() => { setShowDeleteConfirm(false); doDelete(); }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
      {showReferencePanel && (
        <LogReferencePanelPopup editor={activeEditor} onClose={() => setShowReferencePanel(false)} />
      )}
      <div className={`fixed inset-0 z-50 ${isFullPage ? '' : 'bg-black/40 backdrop-blur-sm'}`}>
        <div
          className={`${isFullPage ? 'absolute inset-0 rounded-none' : 'absolute rounded-2xl shadow-2xl'} bg-white border-2 flex flex-col overflow-hidden dark:bg-slate-900 dark:text-slate-100 ${isNewLogWriteMode ? 'border-blue-500 dark:border-blue-700' : 'border-orange-400 dark:border-slate-700'}`}
          style={isFullPage ? undefined : { left: pos.x, top: pos.y, width: size.width, height: size.height }}
        >
          <LogWriteHeader
            date={date}
            shiftType={shiftType}
            teamLabel={teamLabel}
            repTitle={repTitle}
            isNew={isNewLogWriteMode}
            isSaving={isLoadingDetail || isSubmitting || pendingImageCount > 0}
            savingText={pendingImageCount > 0 ? '이미지 처리 중...' : savingText}
            readCount={readStatus?.reads.length ?? null}
            inputsDisabled={inputsDisabled}
            onDateChange={setDate}
            onShiftChange={setShiftType}
            onToggleReadPanel={resolvedEditTarget ? handleToggleReadPanel : undefined}
            onSaveDraft={() => {
              const parsedTags = commitTagsInput(tagsInput);
              if (!validateSummaryTags(parsedTags)) return;
              saveDraft(parsedTags);
              addToast('임시저장 완료', 'success');
            }}
            onSubmit={handleSubmit}
            onDelete={resolvedEditTarget ? () => setShowDeleteConfirm(true) : undefined}
            onClose={onClose}
            onToggleReferencePanel={() => setShowReferencePanel(prev => !prev)}
            onDragStart={isFullPage ? undefined : onDragStart}
          />

          <div className="px-6 pt-3 pb-2 shrink-0 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            <LogWriteMeta
              date={date}
              shiftType={shiftType}
              participants={participants}
              selectableUsers={selectableUsers}
              dutyUserIds={dutyUserIds}
              isLoadingWorkers={isLoadingWorkers}
              inputsDisabled={inputsDisabled}
              isNewLogWriteMode={isNewLogWriteMode}
              editTarget={resolvedEditTarget}
              onUpdatePrimaryWorker={updatePrimaryWorker}
              onChangeParticipants={setParticipants}
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4 bg-slate-50 dark:bg-slate-950">
            {isEditMode && (
              <CardToolbar activeCardIdx={activeCardIdx >= 0 ? activeCardIdx : null} editor={activeEditor} />
            )}
            {isLoadingDetail && (
              <div className="px-4 py-3 bg-slate-100 border border-slate-200 rounded-lg text-[14px] text-slate-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">
                일지 상세를 불러오는 중...
              </div>
            )}
            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[14px] text-red-700">
                {error}
              </div>
            )}
            {readPanelOpen && readStatus && resolvedEditTarget && (
              <ReadStatusPanel readStatus={readStatus} participants={resolvedEditTarget.participants} activeNonAdminUsers={activeNonAdminUsers} />
            )}
            <LogCardList
              editTarget={resolvedEditTarget}
              cards={cards}
              categories={categories}
              statuses={statuses}
              activeCardKey={activeCardKey}
              pendingFilesMap={pendingFilesMap}
              isReadMode={inputsDisabled}
              repCardKey={repCardKey}
              onSetRepCard={setRepCardKey}
              onAddCard={addCard}
              onRemoveCard={handleRemoveCard}
              onUpdateCard={updateCard}
              onMoveCard={moveCard}
              onSetActiveCard={setActiveCardKey}
              onEditorReady={handleEditorReady}
              onAddFiles={addPendingFiles}
              onRemoveFile={removePendingFile}
              onPendingImageCountChange={setPendingImageCount}
              onShowChain={(cardId, cardTitle) => setChainModal({ cardId, cardTitle })}
              onCardLinkClick={(cardId, cardTitle) => setLinkViewModal({ cardId, cardTitle })}
            />
            {resolvedEditTarget && (
              <LogDetailComments
                comments={comments}
                replyToName={replyToName || null}
                isSubmitting={commentSubmitting}
                onSubmit={submitComment}
                onDelete={deleteComment}
                onToggleReaction={toggleReaction}
                onReplyStart={startReply}
                onReplyCancel={cancelReply}
              />
            )}
          </div>

          {!isFullPage && (
            <>
              <div className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize z-10" onMouseDown={onResizeStart('nw')} />
              <div className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize z-10" onMouseDown={onResizeStart('ne')} />
              <div className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize z-10" onMouseDown={onResizeStart('sw')} />
              <div className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize z-10" onMouseDown={onResizeStart('se')} />
              <div className="absolute top-0 left-3 right-3 h-1.5 cursor-n-resize z-10" onMouseDown={onResizeStart('n')} />
              <div className="absolute bottom-0 left-3 right-3 h-1.5 cursor-s-resize z-10" onMouseDown={onResizeStart('s')} />
              <div className="absolute left-0 top-3 bottom-3 w-1.5 cursor-w-resize z-10" onMouseDown={onResizeStart('w')} />
              <div className="absolute right-0 top-3 bottom-3 w-1.5 cursor-e-resize z-10" onMouseDown={onResizeStart('e')} />
            </>
          )}
        </div>
      </div>
      {isFullPage && <ToastContainer />}
    </>
  );
}
