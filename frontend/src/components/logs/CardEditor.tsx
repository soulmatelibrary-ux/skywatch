import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { TextAlign } from '@tiptap/extension-text-align';
import { ResizableImage } from './resizableImage';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Highlight } from '@tiptap/extension-highlight';
import { Mark } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import { useLinkSearch } from '../../hooks/useLinkSearch';
import { LinkSearchPanel } from './LinkSearchPanel';
import { handleImagePaste, handleImageDrop, handleTablePaste } from './editorImagePaste';
import { EditorContextBar } from './EditorContextBar';

interface Props {
  initialContent: string;
  onUpdate: (html: string) => void;
  onFocus: () => void;
  onEditor: (editor: Editor | null) => void;
  onLinkClick?: (cardId: number) => void;
  onPendingImageCountChange?: (count: number) => void;
}

const FontSize = Mark.create({
  name: 'fontSize',
  addAttributes() {
    return { size: { default: null } };
  },
  parseHTML() {
    return [{ tag: 'span[data-size]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', { 'data-size': HTMLAttributes.size, style: `font-size: ${HTMLAttributes.size}` }, 0];
  },
});

const FontFamily = Mark.create({
  name: 'fontFamily',
  addAttributes() {
    return { family: { default: null } };
  },
  parseHTML() {
    return [{ tag: 'span[data-family]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', { 'data-family': HTMLAttributes.family, style: `font-family: ${HTMLAttributes.family}` }, 0];
  },
});

const CardLink = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-card-id': { default: null, parseHTML: el => el.getAttribute('data-card-id') },
      'data-log-id': { default: null, parseHTML: el => el.getAttribute('data-log-id') },
    };
  },
  renderHTML({ HTMLAttributes }) {
    return ['a', HTMLAttributes, 0];
  },
});

/** 커서 바로 앞의 "#검색어" — 카드 링크 검색용. #TD:번호·#LOG:번호는 그대로 글자로 두면 보기 화면에서 링크가 되므로 제외 */
function hashtagBeforeCursor(ed: Editor): { query: string; from: number; to: number } | null {
  const { $from, empty } = ed.state.selection;
  if (!empty) return null;
  const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼');
  const m = before.match(/(?:^|\s)#([^\s#]*)$/);
  if (!m || /^(TD|LOG)[:-]/i.test(m[1])) return null;
  const len = m[1].length + 1;
  return { query: m[1], from: $from.pos - len, to: $from.pos };
}

export function CardEditor({ initialContent, onUpdate, onFocus, onEditor, onLinkClick, onPendingImageCountChange }: Props) {
  const [showLinkSearch, setShowLinkSearch] = useState(false);
  const [pendingImageCount, setPendingImageCount] = useState(0);
  const { query, setQuery, results, isLoading } = useLinkSearch();
  const isMountedRef = useRef(true);

  const detectHashtag = useCallback((ed: Editor | null) => {
    const tag = ed ? hashtagBeforeCursor(ed) : null;
    if (tag) {
      setQuery(tag.query);
      setShowLinkSearch(true);
    } else {
      setShowLinkSearch(false);
    }
  }, [setQuery]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] }, link: false, underline: false }),
      Underline,
      TextStyle,
      FontSize,
      FontFamily,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      CardLink.configure({ openOnClick: false }),
      Color,
      // 이미지 모서리를 끌어 크기 조절 (비율 유지) — 크기는 width/height 속성으로 저장
      ResizableImage.configure({ inline: false, allowBase64: true, resize: { enabled: true, directions: ['top-left', 'top-right', 'bottom-left', 'bottom-right'], alwaysPreserveAspectRatio: true, minWidth: 40, minHeight: 40 } }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
    ],
    content: initialContent || '',
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
      detectHashtag(editor);
    },
    onSelectionUpdate: ({ editor }) => detectHashtag(editor),
    onFocus: () => onFocus(),
    editorProps: {
      attributes: {
        class: 'tiptap block w-full min-h-[280px] px-5 py-4 text-[16px] focus:outline-none [&_strong]:font-bold [&_em]:italic [&_u]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_h1]:text-[24px] [&_h1]:font-bold [&_h1]:my-3 [&_h2]:text-[20px] [&_h2]:font-bold [&_h2]:my-3 [&_h3]:text-[17px] [&_h3]:font-semibold [&_h3]:my-2 [&_hr]:border-slate-300 [&_hr]:my-3 [&_p]:mb-1.5 [&_a]:cursor-pointer [&_a]:underline [&_a]:text-blue-600 dark:text-slate-100 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_td]:border [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-2 dark:[&_th]:border-slate-600 dark:[&_th]:bg-slate-800 dark:[&_td]:border-slate-700 [&_mark]:rounded-sm [&_mark]:px-0.5',
        style: 'line-height: 1.9;',
      },
      handlePaste(view, event) {
        // Table paste first: HWP/Excel clipboard includes both HTML and image,
        // so check for table HTML before falling through to image handler.
        if (handleTablePaste(view, event)) return true;
        if (handleImagePaste(view, event, {
          onStart: () => {
            if (isMountedRef.current) setPendingImageCount(count => count + 1);
          },
          onFinish: () => {
            if (isMountedRef.current) setPendingImageCount(count => Math.max(0, count - 1));
          },
        })) return true;
        return false;
      },
      handleDrop(view, event, _slice, moved) {
        if (moved) return false;
        return handleImageDrop(view, event as DragEvent, {
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

  useEffect(() => {
    onPendingImageCountChange?.(pendingImageCount);
  }, [pendingImageCount, onPendingImageCountChange]);

  useEffect(() => {
    return () => onPendingImageCountChange?.(0);
  }, [onPendingImageCountChange]);

  useEffect(() => {
    onEditor(editor ?? null);
    return () => onEditor(null);
  }, [editor, onEditor]);

  const insertLink = (_logId: number, cardId: number, cardTitle: string, logDate: string) => {
    void _logId;
    if (!editor) return;
    const tag = hashtagBeforeCursor(editor);
    if (!tag) return;

    const linkText = `${logDate} > ${cardTitle}`;
    const linkHref = `#card-${cardId}`;

    // 커서 바로 앞의 "#검색어"만 링크로 바꾼다 (본문 중간에서 써도 됨)
    editor.chain().focus().deleteRange({ from: tag.from, to: tag.to }).insertContent({
      type: 'text',
      text: linkText,
      marks: [{ type: 'link', attrs: { href: linkHref, target: null, rel: null, 'data-card-id': cardId } }],
    }).unsetMark('link').insertContent(' ').run();

    setShowLinkSearch(false);
    setQuery('');
  };

  return (
    <div className="relative" onClick={e => {
      if (!onLinkClick) return;
      const target = e.target as HTMLElement;
      const swLink = target.closest('.sw-link[data-card-id]') as HTMLElement | null;
      if (swLink) {
        e.preventDefault();
        const cardId = swLink.getAttribute('data-card-id');
        if (cardId) onLinkClick(Number(cardId));
        return;
      }
      const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
      if (anchor) {
        const hrefAttr = anchor.getAttribute('href') ?? '';
        const cardMatch = hrefAttr.match(/^#card-(\d+)$/);
        if (cardMatch) {
          e.preventDefault();
          onLinkClick(Number(cardMatch[1]));
        }
      }
    }}>
      <div className="tiptap-editor w-full min-h-[280px] border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-300 dark:border-slate-700 dark:bg-slate-950 dark:focus-within:ring-cyan-400">
        <div className="sticky top-0 z-10"><EditorContextBar editor={editor ?? null} /></div>
        <EditorContent editor={editor} />
      </div>
      {showLinkSearch && (
        <LinkSearchPanel query={query} results={results} isLoading={isLoading} onSelect={insertLink} />
      )}
    </div>
  );
}
