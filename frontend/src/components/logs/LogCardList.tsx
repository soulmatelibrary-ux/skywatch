import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CardEditor } from './CardEditor';
import { CardContentView } from './CardContentView';
import { CardAttachmentSection } from './CardAttachmentSection';
import { LinkViewDialog } from './LinkViewDialog';
import { ConfirmDialog } from '../common/ConfirmDialog';
import type { CardCategory, CardStatusItem, LogDetail } from '../../types/log';
import type { WriteCard } from '../../hooks/useLogWrite';
import type { Editor } from '@tiptap/core';

function getTextContent(html: string): string {
  // 분리된 div 에 innerHTML 을 넣으면 <img onerror> 가 실행될 수 있어 DOMParser 로 글자만 센다
  return new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
}

function getCharCount(title: string, content: string): number {
  return title.length + getTextContent(content).length;
}

function getCharCountColor(count: number): string {
  if (count >= 1000) return 'text-red-600 bg-red-50 border-red-300 dark:text-red-200 dark:bg-red-500/10 dark:border-red-400/30';
  if (count >= 500) return 'text-amber-600 bg-amber-50 border-amber-300 dark:text-amber-200 dark:bg-amber-500/10 dark:border-amber-400/30';
  return 'text-slate-600 bg-slate-50 border-slate-300 dark:text-slate-200 dark:bg-slate-800 dark:border-slate-600';
}

interface Props {
  editTarget: LogDetail | null | undefined;
  cards: WriteCard[];
  categories: CardCategory[];
  statuses: CardStatusItem[];
  activeCardKey: string | null;
  pendingFilesMap: Record<string, File[]>;
  isReadMode?: boolean;
  repCardKey?: string;
  onSetRepCard?: (key: string) => void;
  onAddCard: () => void;
  onRemoveCard: (key: string) => void;
  onUpdateCard: (key: string, patch: Partial<WriteCard>) => void;
  onMoveCard: (key: string, direction: -1 | 1) => void;
  onSetActiveCard: (key: string) => void;
  onEditorReady: (key: string, editor: Editor | null) => void;
  onAddFiles: (key: string, files: File[]) => void;
  onRemoveFile: (key: string, index: number) => void;
  onPendingImageCountChange?: (key: string, count: number) => void;
  onShowChain?: (cardId: number, cardTitle: string) => void;
  onCardLinkClick?: (cardId: number, cardTitle: string) => void;
}

export function LogCardList({
  editTarget,
  cards,
  categories,
  statuses,
  activeCardKey,
  pendingFilesMap,
  isReadMode: isReadModeProp,
  repCardKey,
  onSetRepCard,
  onAddCard,
  onRemoveCard,
  onUpdateCard,
  onMoveCard,
  onSetActiveCard,
  onEditorReady,
  onAddFiles,
  onRemoveFile,
  onPendingImageCountChange,
  onShowChain,
  onCardLinkClick,
}: Props) {
  const defaultCategoryId = categories.find(c => c.name === '기타')?.id ?? categories[0]?.id ?? null;
  const [deletingCardKey, setDeletingCardKey] = useState<string | null>(null);
  const [linkedCard, setLinkedCard] = useState<{ id: number; title: string } | null>(null);
  const [doneAsk, setDoneAsk] = useState<{ key: string; count: number } | null>(null);
  const globalReadMode = isReadModeProp ?? !!editTarget;

  const confirmDelete = () => {
    if (!deletingCardKey) return;
    onRemoveCard(deletingCardKey);
    setDeletingCardKey(null);
  };

  return (
    <div className="space-y-[5px]">
      {linkedCard && createPortal(
        <LinkViewDialog
          cardId={linkedCard.id}
          cardTitle={linkedCard.title}
          onClose={() => setLinkedCard(null)}
        />,
        document.body,
      )}
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-semibold text-slate-700 dark:text-slate-200">카드 ({cards.length})</span>
        {!globalReadMode && (
          <button onClick={onAddCard} className="text-[13px] text-blue-600 hover:text-blue-800 font-medium dark:text-cyan-200 dark:hover:text-cyan-100">
            + 카드 추가
          </button>
        )}
      </div>

      {cards.map((card, idx) => {
        const isActive = card._key === activeCardKey;
        const displayCategoryId = card.category_id ?? defaultCategoryId;
        const charCount = getCharCount(card.title, card.content ?? '');
        const charCountColor = getCharCountColor(charCount);
        const savedCard = editTarget?.cards.find(c => c.id === card.id);
        const isReadMode = isReadModeProp ?? !!editTarget;
        const isRepresentative = repCardKey === card._key;

        return (
          <div
            key={card._key}
            className={`bg-white rounded-xl overflow-hidden shadow-sm transition-all border dark:bg-slate-900 dark:shadow-none ${isActive ? 'border-sky-300 dark:border-cyan-300' : 'border-slate-200 dark:border-cyan-400/35'}`}
            onClick={() => onSetActiveCard(card._key)}
          >
            <div className="flex items-center gap-2 px-3 py-1 border-b border-slate-100 bg-slate-50 dark:border-cyan-300/30 dark:bg-slate-950">
              {!isReadMode && onSetRepCard && (
                <button
                  onClick={e => { e.stopPropagation(); onSetRepCard(card._key); }}
                  title={isRepresentative ? '대표 카드' : '대표 카드로 지정'}
                  className={`shrink-0 text-[16px] leading-none transition ${isRepresentative ? 'text-amber-400' : 'text-slate-300 hover:text-amber-300'}`}
                >
                  {isRepresentative ? '★' : '☆'}
                </button>
              )}
              {isRepresentative && (
                <span className="shrink-0 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-200">
                  대표
                </span>
              )}
              <span className={`text-[12px] font-semibold rounded-full px-2.5 py-0.5 shrink-0 ${isActive ? 'bg-blue-50 text-blue-600 border border-blue-300 dark:bg-cyan-500/15 dark:text-cyan-200 dark:border-cyan-400/30' : 'bg-white text-slate-400 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700'}`}>
                카드 {idx + 1}
              </span>
              <select
                value={displayCategoryId ?? ''}
                onChange={e => onUpdateCard(card._key, { category_id: e.target.value ? Number(e.target.value) : null })}
                disabled={isReadMode}
                className="border border-slate-200 rounded-lg px-2 py-0.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shrink-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-cyan-400"
              >
                {categories.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input
                type="text"
                value={card.title}
                onChange={e => onUpdateCard(card._key, { title: e.target.value })}
                disabled={isReadMode}
                placeholder="카드 제목..."
                className="flex-[2] min-w-[320px] border border-slate-200 bg-slate-50 text-slate-900 font-medium rounded-lg px-3 py-0.5 text-[13px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:bg-slate-100 disabled:text-slate-700 disabled:border-slate-200 disabled:opacity-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-400"
              />
              <select
                value={card.status ?? 'in_progress'}
                onChange={e => {
                  const saved = editTarget?.cards.find(c => c.id === card.id);
                  const count = saved?.thread_card_count ?? 0;
                  // 이어진 일(2장 이상)의 카드를 완료로 바꾸면 묶음 전체가 종료되므로 먼저 확인한다
                  if (e.target.value === 'done' && saved && saved.status !== 'done' && count >= 2) {
                    setDoneAsk({ key: card._key, count });
                    return;
                  }
                  onUpdateCard(card._key, { status: e.target.value as any });
                }}
                disabled={isReadMode}
                className="border border-slate-200 rounded-lg px-2 py-0.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shrink-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-cyan-400"
              >
                {statuses.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <span className={`text-[12px] font-medium rounded-full px-3 py-0.5 shrink-0 border ${charCountColor}`}>
                {charCount} / 1000
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={e => { e.stopPropagation(); onMoveCard(card._key, -1); }} disabled={idx === 0 || isReadMode} className="px-1.5 py-0.5 text-[12px] text-slate-600 border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">↑</button>
                <button onClick={e => { e.stopPropagation(); onMoveCard(card._key, 1); }} disabled={idx === cards.length - 1 || isReadMode} className="px-1.5 py-0.5 text-[12px] text-slate-600 border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">↓</button>
              </div>
              {!isReadMode && <button onClick={e => { e.stopPropagation(); setDeletingCardKey(card._key); }} className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0 transition dark:text-red-300 dark:hover:text-red-200">×</button>}
            </div>

            <div className="p-2">
              {!isReadMode ? (
                <CardEditor
                  key={card._key}
                  initialContent={card.content ?? ''}
                  onUpdate={html => onUpdateCard(card._key, { content: html })}
                  onFocus={() => onSetActiveCard(card._key)}
                  onEditor={editor => onEditorReady(card._key, editor)}
                  onPendingImageCountChange={count => onPendingImageCountChange?.(card._key, count)}
                  onLinkClick={cardId => {
                    const linked = editTarget?.cards.find(c => c.id === cardId);
                    const title = linked?.title ?? `카드 #${cardId}`;
                    if (onCardLinkClick || onShowChain) {
                      (onCardLinkClick ?? onShowChain)?.(cardId, title);
                      return;
                    }
                    setLinkedCard({ id: cardId, title });
                  }}
                />
              ) : (
                <CardContentView
                  html={savedCard?.content ?? ''}
                  onLinkClick={cardId => {
                    const linkedCard = editTarget?.cards.find(c => c.id === cardId);
                    const title = linkedCard?.title ?? `카드 #${cardId}`;
                    (onCardLinkClick ?? onShowChain)?.(cardId, title);
                  }}
                />
              )}
            </div>

            <CardAttachmentSection
              savedAttachments={editTarget ? (editTarget.cards.find(c => c.id === card.id)?.attachments ?? []) : []}
              pendingFiles={pendingFilesMap[card._key] ?? []}
              onAddFiles={files => onAddFiles(card._key, files)}
              onRemovePending={i => onRemoveFile(card._key, i)}
            />
          </div>
        );
      })}

      {!globalReadMode && (
        <button onClick={onAddCard} className="w-full rounded-2xl border border-dashed border-blue-300 bg-blue-50/60 hover:bg-blue-50 text-blue-700 py-4 text-[15px] font-semibold transition dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-200 dark:hover:bg-cyan-500/20">
          + 카드 추가
        </button>
      )}

      <ConfirmDialog
        open={!!doneAsk}
        title="묶음 전체 완료"
        message={`이 카드는 ${doneAsk?.count ?? 0}장으로 이어진 일입니다. 완료하면 연결된 카드 ${doneAsk?.count ?? 0}장이 모두 완료됩니다. 계속할까요?`}
        confirmLabel="모두 완료"
        onConfirm={() => {
          if (doneAsk) onUpdateCard(doneAsk.key, { status: 'done' });
          setDoneAsk(null);
        }}
        onCancel={() => setDoneAsk(null)}
      />

      {deletingCardKey && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={() => setDeletingCardKey(null)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 dark:bg-slate-900 dark:border dark:border-slate-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-[16px] font-semibold text-slate-900 mb-2 dark:text-slate-100">카드를 삭제하시겠습니까?</h3>
            <p className="text-[13px] text-slate-500 mb-6 dark:text-slate-400">
              {cards.find(c => c._key === deletingCardKey)?.title || '이 카드'}를 삭제하면 복구할 수 없습니다.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeletingCardKey(null)} className="px-4 py-2 text-[13px] border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">취소</button>
              <button onClick={confirmDelete} className="px-4 py-2 text-[13px] bg-red-600 text-white rounded-lg hover:bg-red-700 transition dark:bg-red-600 dark:hover:bg-red-500">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
