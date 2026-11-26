import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useCallback, useEffect } from 'react';
import type { CardCategory } from '../../types/log';
import type { WriteCard } from '../../hooks/useLogWrite';
import { LinkSearchModal } from './LinkSearchModal';
import { LinkPopover } from './LinkPopover';
import { useLinkSearch } from '../../hooks/useLinkSearch';
import { useLinkPopover } from '../../hooks/useLinkPopover';
import type { CardLinkResult } from '../../types/log';
import { TextStyle, FontSize, Underline, Color, Highlight, TextAlign, Table, TableRow, TableHeader, TableCell } from '../../lib/editorExtensions';
import { EditorToolbar } from './EditorToolbar';
import { CardAttachSection } from './CardAttachSection';
import { Image } from '@tiptap/extension-image';
import { handleImagePaste } from './editorImagePaste';

interface Props {
  card: WriteCard;
  categories: CardCategory[];
  index: number;
  total: number;
  onChange: (patch: Partial<WriteCard>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  isActive?: boolean;
  showToolbar?: boolean;
  onEditorFocus?: (key: string) => void;
  onEditorReady?: (key: string, editor: ReturnType<typeof useEditor>) => void;
  onPendingFilesChange?: (cardKey: string, files: File[]) => void;
}

export function CardWriteItem({
  card,
  categories,
  index,
  total,
  onChange,
  onMove,
  onRemove,
  isActive = false,
  showToolbar = false,
  onEditorFocus,
  onEditorReady,
  onPendingFilesChange,
}: Props) {
  const { isOpen, open: openLink, close: closeLink } = useLinkSearch();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false }),
      TextStyle, FontSize, Underline, Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: false }),
      TableRow, TableHeader, TableCell,
    ],
    content: card.content ?? '',
    onUpdate: ({ editor }) => onChange({ content: editor.getHTML() }),
    editorProps: {
      handlePaste(view, event) {
        return handleImagePaste(view, event);
      },
    },
  }, [card._key]);

  const { popover, handleEditorClick, dismissPopover, deleteLink } = useLinkPopover(editor ?? null);

  useEffect(() => {
    if (!onEditorReady) return;
    onEditorReady(card._key, editor);
  }, [card._key, editor, onEditorReady]);

  const handleLinkSelect = useCallback((item: CardLinkResult) => {
    if (!editor) return;
    const label = `[${item.log_date}] ${item.log_title ?? ''} > ${item.card_title} (${item.log_author ?? ''})`;
    editor.chain().focus().insertContent(`<a href="#internal" class="sw-link" data-card-id="${item.card_id}" data-log-id="${item.log_id}">${label}</a> `).run();
    closeLink();
  }, [editor, closeLink]);

  return (
    <>
      {isOpen && (
        <LinkSearchModal
          onSelect={handleLinkSelect}
          onClose={closeLink}
          targetCardLabel={`카드 ${index + 1}${card.title ? ` · ${card.title}` : ''}`}
        />
      )}
      {popover && <LinkPopover x={popover.x} y={popover.y} onDelete={deleteLink} onClose={dismissPopover} />}
      <div className={`bg-white rounded-xl overflow-hidden shadow-sm transition-colors dark:bg-slate-900 dark:text-slate-100 ${isActive ? 'border-2 border-sky-300' : 'border-2 border-slate-200 dark:border-slate-700'}`} onFocus={() => onEditorFocus?.(card._key)}>
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-950">
          <span className="text-[12px] font-semibold text-slate-500 bg-white border border-slate-200 rounded-full px-2.5 py-1 shrink-0 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300">
            카드 {index + 1}
          </span>
          {card.id ? (
            <span className="text-[11px] text-slate-500 bg-white border border-slate-200 rounded-full px-2 py-1 shrink-0 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400">
              ID {card.id}
            </span>
          ) : (
            <span className="text-[11px] text-blue-500 bg-blue-50 border border-blue-200 rounded-full px-2 py-1 shrink-0 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400">
              신규
            </span>
          )}
          <select
            value={card.category_id ?? ''}
            onChange={e => onChange({ category_id: e.target.value ? Number(e.target.value) : null })}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white shrink-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-cyan-400"
          >
            <option value="">카테고리 선택</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input
            type="text"
            value={card.title}
            onChange={e => onChange({ title: e.target.value })}
            placeholder="카드 제목"
            className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-400"
          />
          <select
            value={card.status ?? 'open'}
            onChange={e => onChange({ status: e.target.value as WriteCard['status'] })}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white shrink-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-cyan-400"
          >
            <option value="open">진행중</option>
            <option value="hold">보류</option>
            <option value="done">완료</option>
          </select>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onMove(-1)} disabled={index === 0} title="위로" className="text-slate-400 hover:text-slate-600 disabled:opacity-30 px-1 dark:text-slate-500 dark:hover:text-slate-200">↑</button>
            <button onClick={() => onMove(1)} disabled={index === total - 1} title="아래로" className="text-slate-400 hover:text-slate-600 disabled:opacity-30 px-1 dark:text-slate-500 dark:hover:text-slate-200">↓</button>
            <button onClick={onRemove} title="삭제" className="text-red-400 hover:text-red-600 px-1 text-[13px] dark:text-red-300 dark:hover:text-red-200">×</button>
          </div>
        </div>

        {showToolbar && (
          <div className="px-3 py-1.5 border-b border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-900">
            <EditorToolbar editor={editor} onLinkClick={openLink} />
          </div>
        )}

        <div onClick={e => { handleEditorClick(e); }} className="px-5 py-4 min-h-[220px] prose max-w-none tiptap-editor bg-white dark:bg-slate-900 dark:text-slate-100">
          <EditorContent editor={editor} />
        </div>

        <div className="px-5 pb-4">
          <CardAttachSection cardId={card.id ?? null} onPendingChange={files => onPendingFilesChange?.(card._key, files)} />
        </div>
      </div>
    </>
  );
}
