// 일지 상세 모달 — 카드 목록, 댓글, 읽기 현황 표시
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ToastContainer } from '../common/Toast';
import { useLogDetail } from '../../hooks/useLogDetail';
import { useComments } from '../../hooks/useComments';
import { useCardEdit } from '../../hooks/useCardEdit';
import { useCategories } from '../../hooks/useCategories';
import { useCardStatuses } from '../../hooks/useCardStatuses';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useDraggableResizable } from '../../hooks/useDraggableResizable';
import type { ResizeDir } from '../../hooks/useDraggableResizable';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { PasswordConfirmModal } from './PasswordConfirmModal';
import { LogDetailHeader } from './LogDetailHeader';
import { LogMetaInfo } from './LogMetaInfo';
import { LogMetaEditForm } from './LogMetaEditForm';
import { ReadStatusPanel } from './ReadStatusPanel';
import { LogCardItem } from './LogCardItem';
import { CommentSection } from './CommentSection';
import { LogRefDock } from './LogRefDock';
import { LogUnsavedConfirm } from './LogUnsavedConfirm';
import { InquiryFromCardModal } from '../inquiry/InquiryFromCardModal';
import { EditorToolbar } from './EditorToolbar';
import { setWindowTitle } from '../../utils/popupGeometry';
import { logApi, cardApi } from '../../services/api/logApi';
import { usersApi } from '../../services/api/usersApi';
import type { UserSimple } from '../../services/api/usersApi';
import type { LogCard, LogLinkedCard, ParticipantIn } from '../../types/log';
import type { Editor } from '@tiptap/core';

interface Props {
  logId: number | null;
  initialCardId?: number | null;
  initialCommentId?: number | null;
  onClose: () => void;
  onEdit?: () => void;
  onDeleted?: () => void;
  isFullPage?: boolean;
  isReference?: boolean;
}

const HANDLES: { dir: ResizeDir; cls: string }[] = [
  { dir: 'n',  cls: 'absolute top-0 left-4 right-4 h-1.5 cursor-n-resize' },
  { dir: 's',  cls: 'absolute bottom-0 left-4 right-4 h-1.5 cursor-s-resize' },
  { dir: 'e',  cls: 'absolute right-0 top-4 bottom-4 w-1.5 cursor-e-resize' },
  { dir: 'w',  cls: 'absolute left-0 top-4 bottom-4 w-1.5 cursor-w-resize' },
  { dir: 'ne', cls: 'absolute top-0 right-0 w-3 h-3 cursor-ne-resize' },
  { dir: 'nw', cls: 'absolute top-0 left-0 w-3 h-3 cursor-nw-resize' },
  { dir: 'se', cls: 'absolute bottom-0 right-0 w-3 h-3 cursor-se-resize' },
  { dir: 'sw', cls: 'absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize' },
];

export function LogDetailModal({ logId, initialCardId, initialCommentId, onClose, onEdit, onDeleted, isFullPage = false, isReference = false }: Props) {
  const { currentUser } = useAuthStore();
  const { categories } = useCategories();
  const statuses = useCardStatuses();
  const addToast = useUIStore(s => s.addToast);
  const toggleReferencePanel = useUIStore(s => s.toggleReferencePanel);
  const closeReferencePanel = useUIStore(s => s.closeReferencePanel);
  const referencePanelOpen = useUIStore(s => s.referencePanelOpen);
  const setReferenceEditor = useUIStore(s => s.setReferenceEditor);

  const { pos, size, onDragStart, onResizeStart } = useDraggableResizable(
    { width: 1200, height: 820 },
    isFullPage ? undefined : 'sw-detail-modal-size'
  );

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [linkedCards, setLinkedCards] = useState<LogLinkedCard[]>([]);
  const [inquiryModalState, setInquiryModalState] = useState<{ card: LogCard; logDate: string } | null>(null);
  const [referencedLogId, setReferencedLogId] = useState<number | null>(null);
  const [activeNonAdminUsers, setActiveNonAdminUsers] = useState<UserSimple[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);

  const inlineEditSaveRef = useRef<(() => void) | null>(null);
  const pendingCloseRef = useRef(false);
  const prevIsEditSubmittingRef = useRef(false);
  const cardEditorRefs = useRef<Map<number, Editor | null>>(new Map());
  const [activeCardEditor, setActiveCardEditor] = useState<Editor | null>(null);
  const [activeCardHandlers, setActiveCardHandlers] = useState<{ onLinkClick: () => void; onImageUpload: () => void } | null>(null);

  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [metaUsers, setMetaUsers] = useState<UserSimple[]>([]);
  const [isMetaSaving, setIsMetaSaving] = useState(false);
  const [focusedCardId, setFocusedCardId] = useState<number | null>(null);
  const [focusedCommentId, setFocusedCommentId] = useState<number | null>(null);

  const {
    detail, isLoading, readStatus, readPanelOpen,
    toggleReadPanel, updateCardStatus, setDetail,
  } = useLogDetail(logId);

  // 팝업 창이면 창 제목을 "11-06 주간 · 제목" 으로 — 여러 창을 띄웠을 때 작업표시줄에서 구분된다
  useEffect(() => {
    if (!isFullPage || !detail) return;
    setWindowTitle(`${detail.date.slice(5)} ${detail.shift_type} · ${detail.title?.trim() || '업무일지'}`);
  }, [isFullPage, detail]);

  const handleCardUpdated = useCallback((updated: LogCard) => {
    setDetail(prev => prev ? {
      ...prev,
      cards: prev.cards.map(c => c.id === updated.id ? updated : c),
    } : prev);
  }, [setDetail]);

  const handleDelete = useCallback(() => setShowDeleteConfirm(true), []);

  const doDelete = useCallback(async () => {
    if (!logId || !detail) return;
    try {
      await logApi.delete(logId);
      addToast('일지가 삭제되었습니다', 'success');
      onDeleted?.();
      setTimeout(() => onClose(), 800);
    } catch {
      addToast('삭제에 실패했습니다', 'error');
    }
  }, [logId, detail, onClose, addToast, onDeleted]);

  const handleCardDelete = useCallback(async (cardId: number) => {
    if (!window.confirm('정말 이 카드를 삭제하시겠습니까?')) return;
    try {
      await cardApi.delete(cardId);
      addToast('카드가 삭제되었습니다', 'success');
      if (logId) {
        const res = await logApi.get(logId);
        if (res.data.data) setDetail(res.data.data);
      }
    } catch {
      addToast('카드 삭제에 실패했습니다', 'error');
    }
  }, [logId, addToast, setDetail]);

  const handleCarryOver = useCallback(async (cardId: number) => {
    if (!window.confirm('이 카드를 오늘 일지로 이월하시겠습니까?')) return;
    try {
      await cardApi.carryOver(cardId);
      addToast('카드가 오늘 일지로 이월되었습니다', 'success');
      if (logId) {
        const res = await logApi.get(logId);
        if (res.data.data) setDetail(res.data.data);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || '카드 이월에 실패했습니다';
      addToast(msg, 'error');
    }
  }, [logId, addToast, setDetail]);

  const {
    editingId, isSubmitting: isEditSubmitting, startEdit, cancelEdit, save: saveEdit,
  } = useCardEdit(handleCardUpdated);

  const {
    comments, replyToId, replyToName, isSubmitting,
    submit, deleteComment, toggleReaction, startReply, cancelReply,
  } = useComments(logId);

  // 저장하고 닫기: isEditSubmitting true→false 전환 감지
  useEffect(() => {
    if (prevIsEditSubmittingRef.current && !isEditSubmitting && pendingCloseRef.current) {
      pendingCloseRef.current = false;
      if (editingId === null) onClose();
    }
    prevIsEditSubmittingRef.current = isEditSubmitting;
  }, [isEditSubmitting, editingId, onClose]);

  useEffect(() => {
    usersApi.list().then(res => {
      setActiveNonAdminUsers(
        (res.data.data ?? []).filter(u => u.is_active && u.role !== 'admin')
      );
    }).catch(() => {}).finally(() => setUsersLoaded(true));
  }, []);

  useEffect(() => {
    if (!logId) return;
    logApi.getLinkedCards(logId).then(res => {
      setLinkedCards(res.data.data ?? []);
    }).catch(() => setLinkedCards([]));
  }, [logId]);

  useEffect(() => {
    if (!logId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (editingId !== null) {
        setShowUnsavedConfirm(true);
      } else {
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [logId, editingId, onClose]);

  const handleRequestClose = useCallback(() => {
    if (editingId !== null) {
      setShowUnsavedConfirm(true);
    } else {
      onClose();
    }
  }, [editingId, onClose]);

  const handleSaveAndClose = useCallback(() => {
    if (!inlineEditSaveRef.current) return;
    pendingCloseRef.current = true;
    setShowUnsavedConfirm(false);
    inlineEditSaveRef.current();
  }, []);

  const registerSave = useCallback((fn: (() => void) | null) => {
    inlineEditSaveRef.current = fn;
  }, []);

  const registerCardEditor = useCallback((cardId: number, editor: Editor | null) => {
    if (editor) cardEditorRefs.current.set(cardId, editor);
    else cardEditorRefs.current.delete(cardId);
    if (editingId === cardId) setActiveCardEditor(editor);
  }, [editingId]);

  const registerCardHandlers = useCallback((handlers: { onLinkClick: () => void; onImageUpload: () => void } | null) => {
    setActiveCardHandlers(handlers);
  }, []);

  useEffect(() => {
    if (!isEditingMeta || metaUsers.length > 0) return;
    usersApi.list().then(res => setMetaUsers(res.data.data ?? [])).catch(() => {});
  }, [isEditingMeta, metaUsers.length]);

  const handleMetaSave = useCallback(async (data: { date: string; shift_type: string; title: string; participants: ParticipantIn[] }) => {
    if (!logId) return;
    setIsMetaSaving(true);
    try {
      const res = await logApi.update(logId, {
        date: data.date, shift_type: data.shift_type, title: data.title,
        participants: data.participants, cards: [],
      });
      if (res.data.data) setDetail(res.data.data);
      setIsEditingMeta(false);
      addToast('일지 정보가 수정되었습니다', 'success');
    } catch {
      addToast('수정에 실패했습니다', 'error');
    } finally {
      setIsMetaSaving(false);
    }
  }, [logId, setDetail, addToast]);

  useEffect(() => {
    setActiveCardEditor(editingId !== null ? (cardEditorRefs.current.get(editingId) ?? null) : null);
  }, [editingId]);

  // 참고일지 팝업에 현재 편집 중인 에디터 동기화
  useEffect(() => {
    setReferenceEditor(activeCardEditor);
  }, [activeCardEditor, setReferenceEditor]);

  // 모달 언마운트 시 에디터 참조 해제
  useEffect(() => () => setReferenceEditor(null), [setReferenceEditor]);

  useEffect(() => {
    if (!detail || (!initialCardId && !initialCommentId)) return;
    const targetId = initialCardId ? `log-card-${initialCardId}` : `log-comment-${initialCommentId}`;
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setFocusedCardId(initialCardId ?? null);
      setFocusedCommentId(initialCommentId ?? null);
    }, 80);
    const clear = window.setTimeout(() => { setFocusedCardId(null); setFocusedCommentId(null); }, 3000);
    return () => { window.clearTimeout(timer); window.clearTimeout(clear); };
  }, [detail, comments, initialCardId, initialCommentId]);

  const nonAdminReadCount = useMemo(() => {
    if (!readStatus) return detail?.is_read ? 1 : 0;
    return readStatus.reads.filter(r => activeNonAdminUsers.some(u => u.id === r.user_id)).length;
  }, [readStatus, activeNonAdminUsers, detail?.is_read]);

  if (!logId) return null;

  const subModals = createPortal(
    <>
      {showDeleteConfirm && detail && (
        <PasswordConfirmModal
          authorName={detail.author_name ?? '작성자'}
          warningMessage="삭제하면 복구할 수 없습니다."
          confirmLabel="확인 후 삭제"
          onConfirmed={() => { setShowDeleteConfirm(false); doDelete(); }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
      {showUnsavedConfirm && (
        <LogUnsavedConfirm
          onSaveAndClose={handleSaveAndClose}
          onDiscard={() => { cancelEdit(); setShowUnsavedConfirm(false); onClose(); }}
          onCancel={() => setShowUnsavedConfirm(false)}
        />
      )}
      {inquiryModalState && (
        <InquiryFromCardModal
          card={inquiryModalState.card}
          logDate={inquiryModalState.logDate}
          onClose={() => setInquiryModalState(null)}
          onSuccess={() => {
            setInquiryModalState(null);
          }}
        />
      )}
    </>,
    document.body
  );

  const mainModal = (
    <>
      <div className={`fixed inset-0 z-[320]`}>
        <div
          style={isFullPage ? undefined : { position: 'absolute', left: pos.x, top: pos.y, width: size.width, height: size.height }}
          className={`${isFullPage ? 'absolute inset-0 rounded-none shadow-none' : 'absolute rounded-2xl shadow-2xl'} bg-white border-2 ${isReference ? 'border-violet-400 dark:border-violet-600' : 'border-blue-400 dark:border-slate-700'} flex flex-col overflow-hidden dark:bg-slate-900 dark:text-slate-100`}
        >
          {detail && (
            <LogDetailHeader
              detail={detail}
              onToggleReadPanel={toggleReadPanel}
              onToggleReferencePanel={toggleReferencePanel}
              onClose={handleRequestClose}
              onDelete={handleDelete}
              onEdit={onEdit}
              readCount={nonAdminReadCount}
              totalActiveUsers={usersLoaded ? activeNonAdminUsers.length : undefined}
              onDragStart={isFullPage ? undefined : onDragStart}
              isAdmin={currentUser?.role === 'admin'}
              isEditing={editingId !== null}
              referenceOpen={referencePanelOpen}
            />
          )}
          {!detail && (
            <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3 shrink-0 dark:border-slate-700">
              <button onClick={handleRequestClose} className="ml-auto p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition dark:text-slate-500 dark:hover:text-slate-200 dark:hover:bg-slate-800">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          )}

          {/* 팝업 창이면 오른쪽에 참고 일지 패널이 붙는다(도킹). 메인 앱은 AppLayout 의 떠 있는 창을 쓴다 */}
          <div className="flex-1 min-h-0 flex overflow-hidden">
            <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
              {isLoading && (
                <div className="flex items-center justify-center py-16"><LoadingSpinner size={32} /></div>
              )}
              {!isLoading && detail && (
                <>
                  <div className="px-6 pt-4 pb-3 shrink-0 border-b border-slate-100 space-y-3 dark:border-slate-700">
                    {isEditingMeta
                      ? <LogMetaEditForm
                          detail={detail}
                          users={metaUsers}
                          isSaving={isMetaSaving}
                          onSave={handleMetaSave}
                          onCancel={() => setIsEditingMeta(false)}
                        />
                      : <LogMetaInfo detail={detail} onEdit={() => setIsEditingMeta(true)} isAdmin={currentUser?.role === 'admin'} />
                    }
                    {!isEditingMeta && activeCardHandlers !== null && (
                      <div className="pt-1 border-t border-slate-100 dark:border-slate-700/60">
                        <EditorToolbar
                          editor={activeCardEditor}
                          onLinkClick={activeCardHandlers.onLinkClick}
                          onImageUpload={activeCardHandlers.onImageUpload}
                        />
                      </div>
                    )}
                    {readPanelOpen && readStatus && (
                      <ReadStatusPanel readStatus={readStatus} participants={detail.participants} activeNonAdminUsers={activeNonAdminUsers} />
                    )}
                  </div>

                  {/* 새 화면: 본문(카드)을 먼저, 댓글은 맨 아래 */}
                  <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6 mr-2 v2:flex v2:flex-col v2:gap-6 v2:space-y-0">
                    <div className="v2:order-last">
                    <CommentSection
                      comments={comments}
                      focusedCommentId={focusedCommentId}
                      currentUserId={currentUser?.id ?? 0}
                      isAdmin={currentUser?.role === 'admin'}
                      replyToId={replyToId}
                      replyToName={replyToName}
                      isSubmitting={isSubmitting}
                      onSubmit={submit}
                      onDelete={deleteComment}
                      onToggleReaction={toggleReaction}
                      onStartReply={startReply}
                      onCancelReply={cancelReply}
                    />
                    </div>

                    <div>
                      <h3 className="text-[14px] font-bold text-slate-700 mb-3 dark:text-slate-200">일지 카드</h3>
                      <div className="space-y-6">
                        {detail.cards.length === 0 && (
                          <p className="text-[14px] text-slate-400 text-center py-6">카드가 없습니다.</p>
                        )}
                        {detail.cards.map(card => (
                          <div id={`log-card-${card.id}`} key={card.id} className={`scroll-mt-6 space-y-2 rounded-xl transition ${focusedCardId === card.id ? 'ring-4 ring-amber-300/80' : ''}`}>
                            {detail.title?.trim() && detail.title.trim() === card.title.trim() && (
                              <div className="inline-flex items-center gap-1 rounded-full border border-orange-300 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700 dark:border-orange-400/40 dark:bg-orange-500/10 dark:text-orange-200">
                                대표카드
                              </div>
                            )}
                            <LogCardItem
                              card={card}
                              categories={categories}
                              statuses={statuses}
                              canEdit={!!currentUser}
                              onStatusChange={updateCardStatus}
                              onDelete={handleCardDelete}
                              editingId={editingId}
                              isEditSubmitting={isEditSubmitting}
                              onStartEdit={startEdit}
                              onCancelEdit={cancelEdit}
                              onSaveEdit={saveEdit}
                              onRegisterSave={registerSave}
                              onEditorReady={registerCardEditor}
                              onRegisterHandlers={registerCardHandlers}
                              logDate={detail.date}
                              onRegisterInquiry={() => setInquiryModalState({ card, logDate: detail.date })}
                              onLogLinkClick={setReferencedLogId}
                              onCarryOver={handleCarryOver}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {linkedCards.length > 0 && (
                      <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                        <h3 className="text-[14px] font-bold text-slate-700 mb-3 dark:text-slate-200">연결된 카드</h3>
                        <div className="space-y-4">
                          {linkedCards.map(linked => (
                            <div key={linked.card_id} className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                              <div className="font-semibold text-slate-800 text-[14px] mb-2 dark:text-slate-100">{linked.card_title}</div>
                              <div className="space-y-2">
                                {linked.linked_cards.map(target => (
                                  <div key={target.card_id} className="flex items-start gap-2 text-[13px] p-2 bg-white rounded border border-amber-100 dark:bg-slate-900 dark:border-amber-900/30">
                                    <span className="text-amber-600 shrink-0">•</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-slate-800 dark:text-slate-100">{target.card_title}</div>
                                      <div className="text-[12px] text-slate-500 dark:text-slate-400">{target.log_date} · {target.log_title || '(제목 없음)'}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            {isFullPage && referencePanelOpen && (
              <LogRefDock editor={activeCardEditor} onClose={closeReferencePanel} />
            )}
          </div>
          {!isFullPage && HANDLES.map(({ dir, cls }) => (
            <div key={dir} className={cls} onMouseDown={onResizeStart(dir)} />
          ))}
        </div>
      </div>
      {referencedLogId !== null && (
        <LogDetailModal logId={referencedLogId} onClose={() => setReferencedLogId(null)} isReference />
      )}
    </>
  );

  return (
    <>
      {subModals}
      {isFullPage ? (
        <>
          {mainModal}
          <ToastContainer />
        </>
      ) : createPortal(mainModal, document.body)}
    </>
  );
}
