// 편집기 상황별 도구 — 커서가 표 안이면 표 편집, 이미지를 선택하면 크기 조절
import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import type { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';

const BTN = 'rounded-md px-2 py-0.5 text-[12px] font-medium text-slate-600 transition hover:bg-white hover:text-sky-700 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-sky-300';
const SEP = 'mx-1 h-4 w-px bg-slate-300 dark:bg-slate-600';
const IMAGE_WIDTHS: [string, number | null][] = [['작게', 240], ['중간', 480], ['크게', 720], ['원래 크기', null]];

function selectedImage(editor: Editor) {
  const sel = editor.state.selection;
  return sel instanceof NodeSelection && sel.node.type.name === 'image' ? sel.node : null;
}

export function EditorContextBar({ editor }: { editor: Editor | null }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const bump = () => setTick(t => t + 1);
    editor.on('selectionUpdate', bump);
    editor.on('transaction', bump);
    return () => { editor.off('selectionUpdate', bump); editor.off('transaction', bump); };
  }, [editor]);
  if (!editor || !editor.isEditable) return null;

  const run = (fn: () => void) => (e: MouseEvent) => { e.preventDefault(); fn(); };
  const c = () => editor.chain().focus();
  const image = selectedImage(editor);

  if (image) {
    const resize = (w: number | null) => {
      const ratio = image.attrs.width && image.attrs.height ? image.attrs.height / image.attrs.width : null;
      c().updateAttributes('image', { width: w, height: w && ratio ? Math.round(w * ratio) : null }).run();
    };
    return (
      <div className="flex flex-wrap items-center gap-0.5 border-b border-sky-200 bg-sky-50 px-2 py-1 dark:border-sky-900 dark:bg-sky-950/40">
        <span className="mr-1 text-[12px] font-semibold text-sky-800 dark:text-sky-200">이미지</span>
        {IMAGE_WIDTHS.map(([label, w]) => <button key={label} type="button" className={BTN} onMouseDown={run(() => resize(w))}>{label}</button>)}
        <span className={SEP} />
        <button type="button" className={BTN} onMouseDown={run(() => c().deleteSelection().run())}>지우기</button>
        <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">모서리를 끌어서 크기를 바꿀 수도 있습니다</span>
      </div>
    );
  }

  if (!editor.isActive('table')) return null;
  const can = editor.can();
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-sky-200 bg-sky-50 px-2 py-1 dark:border-sky-900 dark:bg-sky-950/40">
      <span className="mr-1 text-[12px] font-semibold text-sky-800 dark:text-sky-200">표</span>
      <button type="button" className={BTN} onMouseDown={run(() => c().addRowBefore().run())}>위에 행</button>
      <button type="button" className={BTN} onMouseDown={run(() => c().addRowAfter().run())}>아래에 행</button>
      <button type="button" className={BTN} onMouseDown={run(() => c().addColumnBefore().run())}>왼쪽에 열</button>
      <button type="button" className={BTN} onMouseDown={run(() => c().addColumnAfter().run())}>오른쪽에 열</button>
      <span className={SEP} />
      <button type="button" className={BTN} onMouseDown={run(() => c().deleteRow().run())}>행 삭제</button>
      <button type="button" className={BTN} onMouseDown={run(() => c().deleteColumn().run())}>열 삭제</button>
      <span className={SEP} />
      <button type="button" className={BTN} disabled={!can.mergeCells()} onMouseDown={run(() => c().mergeCells().run())} title="여러 칸을 끌어 선택한 뒤 누르세요">칸 합치기</button>
      <button type="button" className={BTN} disabled={!can.splitCell()} onMouseDown={run(() => c().splitCell().run())}>칸 나누기</button>
      <button type="button" className={BTN} onMouseDown={run(() => c().toggleHeaderRow().run())}>머리글 행</button>
      <span className={SEP} />
      <button type="button" className={`${BTN} text-red-600 dark:text-red-400`} onMouseDown={run(() => { if (confirm('표 전체를 지울까요?')) c().deleteTable().run(); })}>표 지우기</button>
    </div>
  );
}
