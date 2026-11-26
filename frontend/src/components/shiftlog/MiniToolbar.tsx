import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';
import type { Editor } from '@tiptap/core';
import { ToolbarColorPicker } from '../logs/ToolbarColorPicker';
import { ToolbarTablePicker } from '../logs/ToolbarTablePicker';

interface Props {
  editor: Editor | null;
}

const MAX_IMAGE = 10 * 1024 * 1024;
const INSERTS: [string, string][] = [['조치', '조치: '], ['원인', '원인: '], ['결과', '결과: '], ['다음 할 일', '다음: ']];

const BASE = 'inline-flex h-[28px] shrink-0 items-center justify-center rounded-md border text-[11px] font-medium transition';
const WIDE = `${BASE} px-1.5`;
const ICON = `${BASE} w-[28px]`;
const PILL = 'rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[12px] font-bold text-slate-500 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800';
function Sep() { return <span className="mx-0.5 h-4 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />; }

/** 근무일지 편집 도구 — 서식 + 항목 넣기. 업무일지 CardToolbar 과 같은 기능을 제공한다. */
export function MiniToolbar({ editor }: Props) {
  const [, setTick] = useState(0);
  const [popup, setPopup] = useState<'textColor' | 'highlight' | 'table' | null>(null);
  const [colorPos, setColorPos] = useState<{ top: number; right?: number; left?: number }>({ top: 0 });
  const [tablePos, setTablePos] = useState({ top: 0, left: 0 });
  const textColorRef = useRef<HTMLButtonElement>(null);
  const highlightRef = useRef<HTMLButtonElement>(null);
  const tableRef = useRef<HTMLButtonElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editor) return;
    const bump = () => setTick(t => t + 1);
    editor.on('selectionUpdate', bump);
    editor.on('update', bump);
    return () => { editor.off('selectionUpdate', bump); editor.off('update', bump); };
  }, [editor]);

  const off = !editor;
  const btn = (active = false) => active
    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-cyan-400 dark:bg-cyan-500/15 dark:text-cyan-200'
    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800';
  const run = (fn: (e: Editor) => void) => (ev: MouseEvent) => { ev.preventDefault(); if (editor) { setPopup(null); fn(editor); } };

  const openPopup = (which: typeof popup) => (ev: MouseEvent<HTMLButtonElement>) => {
    ev.preventDefault();
    if (!editor) return;
    if (popup === which) { setPopup(null); return; }
    const ref = which === 'textColor' ? textColorRef : which === 'highlight' ? highlightRef : tableRef;
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      if (which === 'table') setTablePos({ top: r.bottom, left: r.left });
      else setColorPos({ top: r.bottom, right: window.innerWidth - r.right });
    }
    setPopup(which);
  };

  const insertImage = (ev: ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0]; ev.target.value = '';
    if (!file || !editor) return;
    if (file.size > MAX_IMAGE) { alert('10MB 이하 이미지만 넣을 수 있습니다.'); return; }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') editor.chain().focus().setImage({ src: reader.result, alt: file.name }).run(); };
    reader.readAsDataURL(file);
  };

  const openLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href ?? '';
    const next = window.prompt('링크 URL:', prev);
    if (next === null) return;
    if (!next.trim()) editor.chain().focus().extendMarkRange('link').unsetLink().run();
    else editor.chain().focus().extendMarkRange('link').setLink({ href: next.trim() }).run();
  };

  return (
    <div className="relative space-y-1.5">
      <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={insertImage} />

      <div className="flex flex-wrap items-center gap-1">
        <button type="button" disabled={off} className={`${WIDE} ${btn(editor?.isActive('heading', { level: 2 }) ?? false)}`} title="제목 2" onMouseDown={run(e => e.chain().focus().toggleHeading({ level: 2 }).run())}>H2</button>
        <button type="button" disabled={off} className={`${WIDE} ${btn(editor?.isActive('heading', { level: 3 }) ?? false)}`} title="제목 3" onMouseDown={run(e => e.chain().focus().toggleHeading({ level: 3 }).run())}>H3</button>
        <Sep />
        <button type="button" disabled={off} className={`${ICON} ${btn(editor?.isActive('bold') ?? false)}`} title="굵게" onMouseDown={run(e => e.chain().focus().toggleBold().run())}><strong>B</strong></button>
        <button type="button" disabled={off} className={`${ICON} ${btn(editor?.isActive('italic') ?? false)}`} title="기울임" onMouseDown={run(e => e.chain().focus().toggleItalic().run())}><em>I</em></button>
        <button type="button" disabled={off} className={`${ICON} ${btn(editor?.isActive('underline') ?? false)}`} title="밑줄" onMouseDown={run(e => e.chain().focus().toggleUnderline().run())}><span className="underline">U</span></button>
        <button type="button" disabled={off} className={`${ICON} ${btn(editor?.isActive('strike') ?? false)}`} title="취소선" onMouseDown={run(e => e.chain().focus().toggleStrike().run())}><s>S</s></button>
        <Sep />
        <button ref={textColorRef} type="button" disabled={off} className={`${ICON} ${btn(!!editor?.getAttributes('textStyle')?.color)}`} title="글자색" onMouseDown={openPopup('textColor')}>
          <span className="inline-flex h-3 w-3 rounded-full border border-slate-300 bg-[linear-gradient(135deg,#ef4444,#2563eb)]" />
        </button>
        <button ref={highlightRef} type="button" disabled={off} className={`${ICON} ${btn(editor?.isActive('highlight') ?? false)}`} title="형광펜" onMouseDown={openPopup('highlight')}>
          <span className="text-[11px]">✎</span>
        </button>
        <Sep />
        <button type="button" disabled={off} className={`${ICON} ${btn(editor?.isActive({ textAlign: 'left' }) ?? false)}`} title="왼쪽" onMouseDown={run(e => e.chain().focus().setTextAlign('left').run())}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="1.5" rx=".75" fill="currentColor" /><rect x="1" y="5.5" width="8" height="1.5" rx=".75" fill="currentColor" /><rect x="1" y="9" width="10" height="1.5" rx=".75" fill="currentColor" /></svg>
        </button>
        <button type="button" disabled={off} className={`${ICON} ${btn(editor?.isActive({ textAlign: 'center' }) ?? false)}`} title="가운데" onMouseDown={run(e => e.chain().focus().setTextAlign('center').run())}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="1.5" rx=".75" fill="currentColor" /><rect x="3" y="5.5" width="8" height="1.5" rx=".75" fill="currentColor" /><rect x="2" y="9" width="10" height="1.5" rx=".75" fill="currentColor" /></svg>
        </button>
        <Sep />
        <button type="button" disabled={off} className={`${ICON} ${btn(editor?.isActive('bulletList') ?? false)}`} title="글머리" onMouseDown={run(e => e.chain().focus().toggleBulletList().run())}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><circle cx="2.5" cy="3.5" r="1.2" fill="currentColor" /><rect x="5" y="2.75" width="7" height="1.5" rx=".75" fill="currentColor" /><circle cx="2.5" cy="7" r="1.2" fill="currentColor" /><rect x="5" y="6.25" width="7" height="1.5" rx=".75" fill="currentColor" /><circle cx="2.5" cy="10.5" r="1.2" fill="currentColor" /><rect x="5" y="9.75" width="7" height="1.5" rx=".75" fill="currentColor" /></svg>
        </button>
        <button type="button" disabled={off} className={`${ICON} ${btn(editor?.isActive('orderedList') ?? false)}`} title="번호 목록" onMouseDown={run(e => e.chain().focus().toggleOrderedList().run())}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><text x=".5" y="5" fontSize="5" fill="currentColor" fontWeight="bold">1.</text><rect x="5" y="2.75" width="7" height="1.5" rx=".75" fill="currentColor" /><text x=".5" y="8.5" fontSize="5" fill="currentColor" fontWeight="bold">2.</text><rect x="5" y="6.25" width="7" height="1.5" rx=".75" fill="currentColor" /><text x=".5" y="12" fontSize="5" fill="currentColor" fontWeight="bold">3.</text><rect x="5" y="9.75" width="7" height="1.5" rx=".75" fill="currentColor" /></svg>
        </button>
        <Sep />
        <button ref={tableRef} type="button" disabled={off || !!editor?.isActive('table')} className={`${ICON} ${btn(editor?.isActive('table') ?? false)}`} title="표 넣기" onMouseDown={openPopup('table')}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="12" height="12" rx="1.2" stroke="currentColor" strokeWidth="1.2" /><line x1="1" y1="5" x2="13" y2="5" stroke="currentColor" /><line x1="1" y1="9" x2="13" y2="9" stroke="currentColor" /><line x1="5" y1="1" x2="5" y2="13" stroke="currentColor" /><line x1="9" y1="1" x2="9" y2="13" stroke="currentColor" /></svg>
        </button>
        <button type="button" disabled={off} className={`${ICON} ${btn()}`} title="이미지" onMouseDown={ev => { ev.preventDefault(); imageRef.current?.click(); }}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="10" rx="1.2" stroke="currentColor" strokeWidth="1.2" /><circle cx="4.5" cy="5.5" r="1.2" fill="currentColor" /><path d="M1 10l3.5-3.5 2.5 2.5 2-2 3 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button type="button" disabled={off} className={`${ICON} ${btn(editor?.isActive('link') ?? false)}`} title="링크" onMouseDown={ev => { ev.preventDefault(); openLink(); }}>
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M5.5 8.5a3 3 0 004.24 0l1.5-1.5a3 3 0 00-4.24-4.24L6 3.75" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /><path d="M8.5 5.5a3 3 0 00-4.24 0L2.76 7a3 3 0 004.24 4.24L8 10.25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
        </button>
        <Sep />
        <button type="button" disabled={off} className={`${ICON} ${btn()}`} title="실행취소" onMouseDown={run(e => e.chain().focus().undo().run())}>↶</button>
        <button type="button" disabled={off} className={`${ICON} ${btn()}`} title="다시하기" onMouseDown={run(e => e.chain().focus().redo().run())}>↷</button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[12px] text-slate-400">항목</span>
        {INSERTS.map(([label, prefix]) => (
          <button key={label} type="button" disabled={off} className={PILL}
            onMouseDown={run(e => e.chain().focus('end').insertContent(`<p>${prefix}</p>`).run())}>{label}</button>
        ))}
        <span className="flex-1" />
        <span className="text-[11px] text-slate-400">#검색어 → 카드 연결 · #TD:번호 → 문서</span>
      </div>
      {popup === 'textColor' && editor && (
        <ToolbarColorPicker mode="text" pos={colorPos}
          onSelect={c => { editor.chain().focus().setColor(c).run(); setPopup(null); }}
          onClear={() => { editor.chain().focus().unsetColor().run(); setPopup(null); }} />
      )}
      {popup === 'highlight' && editor && (
        <ToolbarColorPicker mode="highlight" pos={colorPos}
          onSelect={c => { editor.chain().focus().setHighlight({ color: c }).run(); setPopup(null); }}
          onClear={() => { editor.chain().focus().unsetHighlight().run(); setPopup(null); }} />
      )}
      {popup === 'table' && editor && (
        <ToolbarTablePicker pos={tablePos}
          onInsert={(r, c) => { editor.chain().focus().insertTable({ rows: r, cols: c, withHeaderRow: true }).run(); setPopup(null); }} />
      )}
    </div>
  );
}
