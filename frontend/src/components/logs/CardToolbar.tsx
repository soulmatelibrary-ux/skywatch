import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import type { ChangeEvent, MouseEvent } from 'react';
import { ToolbarColorPicker } from './ToolbarColorPicker';
import { ToolbarTablePicker } from './ToolbarTablePicker';

interface Props {
  activeCardIdx: number | null;
  editor: Editor | null;
}

// SVG 아이콘
function IcoAlignLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="2" width="12" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="1" y="5.5" width="8" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="1" y="9" width="10" height="1.5" rx="0.75" fill="currentColor" />
    </svg>
  );
}

function IcoBulletList() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="2.5" cy="3.5" r="1.2" fill="currentColor" />
      <rect x="5" y="2.75" width="7" height="1.5" rx="0.75" fill="currentColor" />
      <circle cx="2.5" cy="7" r="1.2" fill="currentColor" />
      <rect x="5" y="6.25" width="7" height="1.5" rx="0.75" fill="currentColor" />
      <circle cx="2.5" cy="10.5" r="1.2" fill="currentColor" />
      <rect x="5" y="9.75" width="7" height="1.5" rx="0.75" fill="currentColor" />
    </svg>
  );
}

function IcoOrderedList() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <text x="0.5" y="5" fontSize="5" fill="currentColor" fontWeight="bold">1.</text>
      <rect x="5" y="2.75" width="7" height="1.5" rx="0.75" fill="currentColor" />
      <text x="0.5" y="8.5" fontSize="5" fill="currentColor" fontWeight="bold">2.</text>
      <rect x="5" y="6.25" width="7" height="1.5" rx="0.75" fill="currentColor" />
      <text x="0.5" y="12" fontSize="5" fill="currentColor" fontWeight="bold">3.</text>
      <rect x="5" y="9.75" width="7" height="1.5" rx="0.75" fill="currentColor" />
    </svg>
  );
}

function IcoTaskList() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="2" width="3" height="3" rx="0.6" stroke="currentColor" strokeWidth="1.2" />
      <rect x="5" y="2.75" width="7" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="1" y="6" width="3" height="3" rx="0.6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M1.7 7.5l0.8 0.8 1.3-1.3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <rect x="5" y="6.75" width="7" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="1" y="10" width="3" height="3" rx="0.6" stroke="currentColor" strokeWidth="1.2" />
      <rect x="5" y="10.75" width="7" height="1.5" rx="0.75" fill="currentColor" />
    </svg>
  );
}

function IcoTable() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="12" height="12" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
      <line x1="1" y1="5" x2="13" y2="5" stroke="currentColor" strokeWidth="1" />
      <line x1="1" y1="9" x2="13" y2="9" stroke="currentColor" strokeWidth="1" />
      <line x1="5" y1="1" x2="5" y2="13" stroke="currentColor" strokeWidth="1" />
      <line x1="9" y1="1" x2="9" y2="13" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function IcoImage() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="2" width="12" height="10" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="4.5" cy="5.5" r="1.2" fill="currentColor" />
      <path d="M1 10l3.5-3.5 2.5 2.5 2-2 3 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IcoLink() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5.5 8.5a3 3 0 0 0 4.24 0l1.5-1.5a3 3 0 0 0-4.24-4.24L6 3.75" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M8.5 5.5a3 3 0 0 0-4.24 0L2.76 7a3 3 0 0 0 4.24 4.24L8 10.25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-slate-200 shrink-0 mx-0.5 dark:bg-slate-700" />;
}

export function CardToolbar({ activeCardIdx, editor }: Props) {
  const [fontSize, setFontSize] = useState('16px');
  const [fontFamily, setFontFamily] = useState('inherit');
  const [popup, setPopup] = useState<'textColor' | 'highlight' | 'table' | null>(null);
  const [colorPos, setColorPos] = useState<{ top: number; right?: number; left?: number }>({ top: 0 });
  const [tablePos, setTablePos] = useState({ top: 0, left: 0 });

  const imageInputRef = useRef<HTMLInputElement>(null);
  const textColorRef = useRef<HTMLButtonElement>(null);
  const highlightRef = useRef<HTMLButtonElement>(null);
  const tableRef = useRef<HTMLButtonElement>(null);

  const isReady = activeCardIdx !== null && activeCardIdx >= 0 && !!editor;

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const sizeAttrs = editor.getAttributes('fontSize') || {};
      const familyAttrs = editor.getAttributes('fontFamily') || {};
      setFontSize(sizeAttrs.size || '16px');
      setFontFamily(familyAttrs.family || 'inherit');
    };
    update();
    editor.on('update', update);
    editor.on('selectionUpdate', update);
    return () => {
      editor.off('update', update);
      editor.off('selectionUpdate', update);
    };
  }, [editor]);

  const btn = (active = false) => {
    if (!isReady) return 'border-slate-200 bg-white text-slate-300 opacity-50 cursor-not-allowed dark:border-slate-700 dark:bg-slate-900 dark:text-slate-600';
    return active
      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-cyan-400 dark:bg-cyan-500/15 dark:text-cyan-200'
      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';
  };

  const baseBtn = 'inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] border text-[11px] font-medium transition';
  const wideBtn = 'inline-flex h-[30px] shrink-0 items-center justify-center rounded-[8px] border text-[11px] font-medium transition px-2';

  const exec = (fn: () => void) => (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!isReady) return;
    setPopup(null);
    fn();
  };

  const openPopup = (which: 'textColor' | 'highlight' | 'table') => (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!isReady) return;
    if (popup === which) { setPopup(null); return; }
    if (which === 'textColor' && textColorRef.current) {
      const r = textColorRef.current.getBoundingClientRect();
      setColorPos({ top: r.bottom, right: window.innerWidth - r.right });
    } else if (which === 'highlight' && highlightRef.current) {
      const r = highlightRef.current.getBoundingClientRect();
      setColorPos({ top: r.bottom, right: window.innerWidth - r.right });
    } else if (which === 'table' && tableRef.current) {
      const r = tableRef.current.getBoundingClientRect();
      setTablePos({ top: r.bottom, left: r.left });
    }
    setPopup(which);
  };

  const openLinkPrompt = () => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href ?? '';
    const next = window.prompt('링크 URL을 입력하세요:', prev);
    if (next === null) return;
    if (next.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: next.trim() }).run();
    }
  };

  const handleImageFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editor) return;
    if (file.size > 10 * 1024 * 1024) {
      alert(`이미지 크기가 너무 큽니다. 10MB 이하만 삽입 가능합니다.\n(현재: ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        editor.chain().focus().setImage({ src: reader.result, alt: file.name }).run();
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-[14px] border border-slate-200 bg-white shadow-sm overflow-visible dark:border-slate-700 dark:bg-slate-900 z-20 relative">
      <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageFile} />

      {/* 한 줄: 폰트 | 글자크기 | H1~H3 | B/I/U/S | 글자색 | 형광펜 | 정렬 | 목록 | 표 | 코드 | 구분선 | 이미지 | 링크 | 실행취소/다시하기 */}
      {/* 좁은 칸(PR 등록 등)에서도 이미지·표 버튼이 가려지지 않게 줄바꿈 */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-1.5">
        {/* 글꼴 */}
        <select
          value={fontFamily}
          onChange={e => { if (!editor || !isReady) return; editor.chain().focus().setMark('fontFamily', { family: e.target.value }).run(); }}
          disabled={!isReady}
          className="h-[30px] px-1.5 rounded-[8px] border text-[11px] font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-white text-slate-600 border-slate-200 hover:border-slate-300 shrink-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          title="글꼴"
        >
          <option value="inherit">기본</option>
          <option value="Georgia, serif">명조</option>
          <option value="Courier New, monospace">고정</option>
          <option value="Arial, sans-serif">고딕</option>
        </select>

        {/* 글자크기 */}
        <select
          value={fontSize}
          onChange={e => { if (!editor || !isReady) return; editor.chain().focus().setMark('fontSize', { size: e.target.value }).run(); }}
          disabled={!isReady}
          className="h-[30px] px-1.5 rounded-[8px] border text-[11px] font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-white text-slate-600 border-slate-200 hover:border-slate-300 shrink-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          title="글자크기"
        >
          <option value="12px">12</option>
          <option value="14px">14</option>
          <option value="16px">16</option>
          <option value="18px">18</option>
          <option value="20px">20</option>
          <option value="24px">24</option>
          <option value="28px">28</option>
          <option value="32px">32</option>
        </select>

        <Divider />

        {/* H1 H2 H3 */}
        {([1, 2, 3] as const).map(level => (
          <button
            key={`h${level}`}
            type="button"
            disabled={!isReady}
            className={`${wideBtn} ${btn(editor?.isActive('heading', { level }) ?? false)}`}
            title={`제목 ${level}`}
            onMouseDown={exec(() => editor?.chain().focus().toggleHeading({ level }).run())}
          >
            H{level}
          </button>
        ))}

        <Divider />

        {/* B I U S */}
        <button type="button" disabled={!isReady} className={`${baseBtn} ${btn(editor?.isActive('bold') ?? false)}`} title="굵게" onMouseDown={exec(() => editor?.chain().focus().toggleBold().run())}><strong>B</strong></button>
        <button type="button" disabled={!isReady} className={`${baseBtn} ${btn(editor?.isActive('italic') ?? false)}`} title="기울임" onMouseDown={exec(() => editor?.chain().focus().toggleItalic().run())}><em>I</em></button>
        <button type="button" disabled={!isReady} className={`${baseBtn} ${btn(editor?.isActive('underline') ?? false)}`} title="밑줄" onMouseDown={exec(() => editor?.chain().focus().toggleUnderline().run())}><span className="underline">U</span></button>
        <button type="button" disabled={!isReady} className={`${baseBtn} ${btn(editor?.isActive('strike') ?? false)}`} title="취소선" onMouseDown={exec(() => editor?.chain().focus().toggleStrike().run())}><s>S</s></button>

        <Divider />

        {/* 글자색 */}
        <button
          ref={textColorRef}
          type="button"
          disabled={!isReady}
          className={`${baseBtn} ${btn(!!editor?.getAttributes('textStyle')?.color)}`}
          title="글자색"
          onMouseDown={openPopup('textColor')}
        >
          <span className="inline-flex h-3.5 w-3.5 rounded-full border border-slate-300 bg-[linear-gradient(135deg,#ef4444,#2563eb)]" />
        </button>

        {/* 형광펜 */}
        <button
          ref={highlightRef}
          type="button"
          disabled={!isReady}
          className={`${baseBtn} ${btn(editor?.isActive('highlight') ?? false)}`}
          title="형광펜"
          onMouseDown={openPopup('highlight')}
        >
          <span className="text-[12px]">✎</span>
        </button>

        <Divider />

        {/* 정렬 | 목록 | 표 코드 구분선 | 이미지 링크 | 취소/다시하기 */}
        {/* 정렬 */}
        <button type="button" disabled={!isReady} className={`${baseBtn} ${btn(editor?.isActive({ textAlign: 'left' }) ?? false)}`} title="왼쪽 정렬" onMouseDown={exec(() => editor?.chain().focus().setTextAlign('left').run())}><IcoAlignLeft /></button>
        <button type="button" disabled={!isReady} className={`${baseBtn} ${btn(editor?.isActive({ textAlign: 'center' }) ?? false)}`} title="가운데 정렬" onMouseDown={exec(() => editor?.chain().focus().setTextAlign('center').run())}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="2" width="12" height="1.5" rx="0.75" fill="currentColor" />
            <rect x="3" y="5.5" width="8" height="1.5" rx="0.75" fill="currentColor" />
            <rect x="2" y="9" width="10" height="1.5" rx="0.75" fill="currentColor" />
          </svg>
        </button>
        <button type="button" disabled={!isReady} className={`${baseBtn} ${btn(editor?.isActive({ textAlign: 'right' }) ?? false)}`} title="오른쪽 정렬" onMouseDown={exec(() => editor?.chain().focus().setTextAlign('right').run())}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="2" width="12" height="1.5" rx="0.75" fill="currentColor" />
            <rect x="5" y="5.5" width="8" height="1.5" rx="0.75" fill="currentColor" />
            <rect x="3" y="9" width="10" height="1.5" rx="0.75" fill="currentColor" />
          </svg>
        </button>

        <Divider />

        {/* 목록 */}
        <button type="button" disabled={!isReady} className={`${baseBtn} ${btn(editor?.isActive('bulletList') ?? false)}`} title="글머리" onMouseDown={exec(() => editor?.chain().focus().toggleBulletList().run())}><IcoBulletList /></button>
        <button type="button" disabled={!isReady} className={`${baseBtn} ${btn(editor?.isActive('orderedList') ?? false)}`} title="번호 목록" onMouseDown={exec(() => editor?.chain().focus().toggleOrderedList().run())}><IcoOrderedList /></button>
        <button type="button" disabled={!isReady} className={`${baseBtn} ${btn(editor?.isActive('taskList') ?? false)}`} title="체크리스트" onMouseDown={exec(() => editor?.chain().focus().toggleTaskList().run())}><IcoTaskList /></button>

        <Divider />

        {/* 표 */}
        <button
          ref={tableRef}
          type="button"
          disabled={!isReady}
          className={`${baseBtn} ${btn(editor?.isActive('table') ?? false)}`}
          title="표 삽입"
          onMouseDown={openPopup('table')}
        >
          <IcoTable />
        </button>

        {/* 코드 */}
        <button type="button" disabled={!isReady} className={`${baseBtn} ${btn(editor?.isActive('codeBlock') ?? false)}`} title="코드" onMouseDown={exec(() => editor?.chain().focus().toggleCodeBlock().run())}>
          <span className="text-[10px]">&lt;/&gt;</span>
        </button>

        {/* 구분선 */}
        <button type="button" disabled={!isReady} className={`${baseBtn} ${btn()}`} title="가로 구분선" onMouseDown={exec(() => editor?.chain().focus().setHorizontalRule().run())}>
          <span className="text-[11px]">─</span>
        </button>

        <Divider />

        {/* 이미지 */}
        <button type="button" disabled={!isReady} className={`${baseBtn} ${btn()}`} title="이미지 삽입" onMouseDown={e => { e.preventDefault(); if (!isReady) return; imageInputRef.current?.click(); }}>
          <IcoImage />
        </button>

        {/* 링크 */}
        <button type="button" disabled={!isReady} className={`${baseBtn} ${btn(editor?.isActive('link') ?? false)}`} title="링크" onMouseDown={e => { e.preventDefault(); if (!isReady) return; openLinkPrompt(); }}>
          <IcoLink />
        </button>

        <Divider />

        {/* 실행취소 / 다시하기 */}
        <button type="button" disabled={!isReady} className={`${baseBtn} ${btn()}`} title="실행취소" onMouseDown={exec(() => editor?.chain().focus().undo().run())}>
          <span className="text-[14px]">↶</span>
        </button>
        <button type="button" disabled={!isReady} className={`${baseBtn} ${btn()}`} title="다시하기" onMouseDown={exec(() => editor?.chain().focus().redo().run())}>
          <span className="text-[14px]">↷</span>
        </button>
      </div>

      {/* 색상 팝업 */}
      {popup === 'textColor' && isReady && (
        <ToolbarColorPicker
          mode="text"
          pos={colorPos}
          onSelect={color => { editor?.chain().focus().setColor(color).run(); setPopup(null); }}
          onClear={() => { editor?.chain().focus().unsetColor().run(); setPopup(null); }}
        />
      )}
      {popup === 'highlight' && isReady && (
        <ToolbarColorPicker
          mode="highlight"
          pos={colorPos}
          onSelect={color => { editor?.chain().focus().setHighlight({ color }).run(); setPopup(null); }}
          onClear={() => { editor?.chain().focus().unsetHighlight().run(); setPopup(null); }}
        />
      )}
      {popup === 'table' && isReady && (
        <ToolbarTablePicker
          pos={tablePos}
          onInsert={(r, c) => { editor?.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: true }).run(); setPopup(null); }}
        />
      )}
    </div>
  );
}
