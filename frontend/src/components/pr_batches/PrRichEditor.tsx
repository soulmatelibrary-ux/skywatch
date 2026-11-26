import { EditorContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { handleImageDrop, handleImagePaste, handleTablePaste } from '../logs/editorImagePaste';

interface Props {
  initialHtml: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const MAX_IMAGE = 10 * 1024 * 1024;

export function PrRichEditor({ initialHtml, onChange, placeholder, minHeight = 140 }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [3, 4] }, link: false }),
      Image.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: false }), TableRow, TableHeader, TableCell,
    ],
    content: initialHtml,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: { class: 'sw-content outline-none px-3 py-2 text-[12px]', style: `min-height:${minHeight}px` },
      handlePaste: (view, event) => handleTablePaste(view, event) || handleImagePaste(view, event),
      handleDrop: (view, event, _slice, moved) => !moved && handleImageDrop(view, event),
    },
  });

  const insertImage = (file?: File) => {
    if (!file || !editor) return;
    if (file.size > MAX_IMAGE) { alert('10MB 이하 이미지만 넣을 수 있습니다.'); return; }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') editor.chain().focus().setImage({ src: reader.result }).run(); };
    reader.readAsDataURL(file);
  };

  if (!editor) return null;
  const inTable = editor.isActive('table');
  const btn = (label: string, run: () => void, active = false, title?: string) => (
    <button type="button" key={label} title={title ?? label} onMouseDown={e => e.preventDefault()} onClick={run}
      className={`rounded px-1.5 py-0.5 text-[11px] ${active ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'}`}>{label}</button>
  );
  const c = () => editor.chain().focus();

  return <div className="mt-1 overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800">
    <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-1.5 py-1 dark:border-slate-700 dark:bg-slate-900">
      {btn('B', () => c().toggleBold().run(), editor.isActive('bold'), '굵게')}
      {btn('• 목록', () => c().toggleBulletList().run(), editor.isActive('bulletList'))}
      {btn('1. 목록', () => c().toggleOrderedList().run(), editor.isActive('orderedList'))}
      <span className="mx-1 h-4 w-px bg-slate-300" />
      {btn('표 삽입', () => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}
      {inTable && <>
        {btn('행+', () => c().addRowAfter().run(), false, '아래에 행 추가')}
        {btn('열+', () => c().addColumnAfter().run(), false, '오른쪽에 열 추가')}
        {btn('행-', () => c().deleteRow().run(), false, '행 삭제')}
        {btn('열-', () => c().deleteColumn().run(), false, '열 삭제')}
        {btn('표 삭제', () => c().deleteTable().run())}
      </>}
      <span className="mx-1 h-4 w-px bg-slate-300" />
      <label className="cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700">
        이미지
        <input type="file" accept="image/*" className="hidden"
          onChange={e => { insertImage(e.target.files?.[0]); e.target.value = ''; }} />
      </label>
      {placeholder && <span className="ml-auto pr-1 text-[10px] text-slate-400">{placeholder}</span>}
    </div>
    <div className="max-h-[38vh] overflow-y-auto"><EditorContent editor={editor} /></div>
  </div>;
}
