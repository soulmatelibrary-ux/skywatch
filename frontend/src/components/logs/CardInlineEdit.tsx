import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import type { CardCategory, LogCard } from '../../types/log';
import { LinkSearchModal } from './LinkSearchModal';
import type { CardLinkResult } from '../../types/log';
import { TextStyle, FontSize, Underline, Color, Highlight, TextAlign, Table, TableRow, TableHeader, TableCell } from '../../lib/editorExtensions';
import { Image } from '@tiptap/extension-image';
import { handleImagePaste } from './editorImagePaste';

interface Props {
  card: LogCard;
  categories: CardCategory[];
  isSubmitting: boolean;
  onSave: (data: { title: string; content: string; category_id: number | null }) => void;
  onCancel: () => void;
  onRegisterSave?: (fn: (() => void) | null) => void;
  onEditorReady?: (editor: Editor | null) => void;
  onRegisterHandlers?: (handlers: { onLinkClick: () => void; onImageUpload: () => void } | null) => void;
}

export function CardInlineEdit({ card, categories, isSubmitting, onSave, onCancel, onRegisterSave, onEditorReady, onRegisterHandlers }: Props) {
  const [title, setTitle] = useState(card.title);
  const [categoryId, setCategoryId] = useState<number | null>(card.category_id);
  const [linkOpen, setLinkOpen] = useState(false);
  const [pendingImageCount, setPendingImageCount] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);

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
    editorProps: {
      handlePaste(view, event) {
        return handleImagePaste(view, event, {
          onStart: () => {
            if (isMountedRef.current) setPendingImageCount(count => count + 1);
          },
          onFinish: () => {
            if (isMountedRef.current) setPendingImageCount(count => Math.max(0, count - 1));
          },
        });
      },
    },
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleLinkSelect = useCallback((item: CardLinkResult) => {
    if (!editor) return;
    if (card.id && item.card_id === card.id) return;
    const label = `[${item.log_date}] ${item.log_title ?? ''} > ${item.card_title} (${item.log_author ?? ''})`;
    editor.chain().focus().insertContent(
      `<a href="#card-${item.card_id}" class="sw-link" data-card-id="${item.card_id}">${label}</a> `
    ).run();
    setLinkOpen(false);
  }, [editor]);

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    setPendingImageCount(count => count + 1);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        editor.chain().focus().insertContent(`<img src="${reader.result}" alt="${file.name}" />`).run();
      }
    };
    reader.onloadend = () => {
      if (isMountedRef.current) setPendingImageCount(count => Math.max(0, count - 1));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  const handleSave = useCallback(() => {
    if (!title.trim()) return;
    onSave({ title, content: editor?.getHTML() ?? '', category_id: categoryId });
  }, [title, editor, categoryId, onSave]);

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  useEffect(() => {
    onRegisterSave?.(() => handleSaveRef.current());
    return () => onRegisterSave?.(null);
  }, [onRegisterSave]);

  useEffect(() => {
    onEditorReady?.(editor ?? null);
    return () => onEditorReady?.(null);
  }, [editor, onEditorReady]);

  useEffect(() => {
    onRegisterHandlers?.({
      onLinkClick: () => setLinkOpen(true),
      onImageUpload: () => imageInputRef.current?.click(),
    });
    return () => onRegisterHandlers?.(null);
  }, [onRegisterHandlers]);

  return (
    <>
      {linkOpen && <LinkSearchModal onSelect={handleLinkSelect} onClose={() => setLinkOpen(false)} excludeCardId={card.id ?? null} />}
      <div className="border border-blue-300 rounded-xl overflow-hidden ring-1 ring-blue-200 dark:border-cyan-400/30 dark:ring-cyan-500/10">
        <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border-b border-blue-200 dark:bg-cyan-500/10 dark:border-cyan-500/20">
          <input
            autoFocus
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="flex-1 text-[14px] font-medium bg-transparent outline-none text-slate-900 dark:text-slate-100"
          />
          <select
            value={categoryId ?? ''}
            onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : null)}
            className="text-[12px] border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none max-w-[120px] text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="">카테고리 없음</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />

        <div className="px-4 py-3 min-h-[80px] prose prose-sm max-w-none tiptap-editor bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-200">
          <EditorContent editor={editor} />
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-2.5 bg-slate-50 border-t border-slate-200 dark:bg-slate-950 dark:border-slate-700">
          <button onClick={onCancel} className="text-[13px] px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 transition dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">취소</button>
          <button
            onClick={handleSave}
            disabled={isSubmitting || pendingImageCount > 0 || !title.trim()}
            className="text-[13px] px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {isSubmitting ? '저장 중...' : pendingImageCount > 0 ? '이미지 처리 중...' : '저장'}
          </button>
        </div>
      </div>
    </>
  );
}
