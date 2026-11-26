import type { Editor } from '@tiptap/react';
import { useRef } from 'react';

const FONT_SIZES = [
  { label: '소', size: '13px' },
  { label: '보통', size: null },
  { label: '대', size: '19px' },
  { label: '특대', size: '24px' },
];

interface Props {
  editor: Editor | null;
  onLinkClick?: () => void;
  onImageUpload?: () => void;
}

function Btn({ title, active, disabled, onClick, className = '', children }: {
  title: string; active?: boolean; disabled?: boolean;
  onClick: (e: React.MouseEvent) => void; className?: string; children: React.ReactNode;
}) {
  return (
    <button title={title} onMouseDown={onClick} disabled={disabled}
      className={[
        'px-1.5 py-1 rounded text-[12px] transition select-none leading-none disabled:opacity-40 disabled:cursor-not-allowed',
        active ? 'bg-blue-100 text-blue-700 font-semibold dark:bg-blue-900/40 dark:text-blue-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700',
        className,
      ].join(' ')}>
      {children}
    </button>
  );
}

const Sep = () => <span className="inline-block w-px h-4 bg-slate-200 dark:bg-slate-600 mx-0.5 self-center" />;

export function EditorToolbar({ editor, onLinkClick, onImageUpload }: Props) {
  const colorRef = useRef<HTMLInputElement>(null);
  const highlightRef = useRef<HTMLInputElement>(null);
  const off = !editor;

  function cmd(e: React.MouseEvent, fn: () => void) {
    e.preventDefault();
    if (!editor) return;
    fn();
  }

  function isSize(size: string | null) {
    if (!editor) return false;
    return size === null ? !editor.getAttributes('textStyle').fontSize
      : editor.isActive('textStyle', { fontSize: size });
  }

  const headingLevel = editor?.isActive('heading', { level: 1 }) ? '1'
    : editor?.isActive('heading', { level: 2 }) ? '2'
    : editor?.isActive('heading', { level: 3 }) ? '3' : '0';

  const currentColor = editor?.getAttributes('textStyle').color ?? '#1e293b';

  return (
    <div className="flex items-center gap-0.5 flex-wrap">

      {/* 단락 스타일 */}
      <select value={headingLevel} disabled={off}
        onMouseDown={e => e.preventDefault()}
        onChange={e => {
          if (!editor) return;
          const v = e.target.value;
          v === '0' ? editor.chain().setParagraph().run()
            : editor.chain().setHeading({ level: Number(v) as 1 | 2 | 3 }).run();
        }}
        className="border border-slate-200 rounded px-1.5 py-0.5 text-[12px] bg-white text-slate-700 focus:outline-none disabled:opacity-40 cursor-pointer dark:bg-slate-900 dark:text-slate-200 dark:border-slate-600">
        <option value="0">본문</option>
        <option value="1">H1 제목1</option>
        <option value="2">H2 제목2</option>
        <option value="3">H3 제목3</option>
      </select>
      <Sep />

      {/* 기본 서식 */}
      <Btn title="굵게 (Ctrl+B)" active={editor?.isActive('bold')} disabled={off} className="font-bold"
        onClick={e => cmd(e, () => editor!.chain().toggleBold().run())}>B</Btn>
      <Btn title="기울임 (Ctrl+I)" active={editor?.isActive('italic')} disabled={off} className="italic"
        onClick={e => cmd(e, () => editor!.chain().toggleItalic().run())}>I</Btn>
      <Btn title="밑줄 (Ctrl+U)" active={editor?.isActive('underline')} disabled={off} className="underline"
        onClick={e => cmd(e, () => editor!.chain().toggleUnderline().run())}>U</Btn>
      <Btn title="취소선" active={editor?.isActive('strike')} disabled={off} className="line-through"
        onClick={e => cmd(e, () => editor!.chain().toggleStrike().run())}>S</Btn>
      <Sep />

      {/* 글자 크기 */}
      {FONT_SIZES.map(({ label, size }) => (
        <Btn key={label} title={size ?? '기본 크기'} active={isSize(size)} disabled={off}
          onClick={e => cmd(e, () => size ? editor!.chain().setFontSize(size).run() : editor!.chain().unsetFontSize().run())}>
          {label}
        </Btn>
      ))}
      <Sep />

      {/* 정렬 */}
      <Btn title="왼쪽 정렬" active={editor?.isActive({ textAlign: 'left' })} disabled={off}
        onClick={e => cmd(e, () => editor!.chain().setTextAlign('left').run())}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor"><rect x="0" y="1" width="13" height="1.5" rx="1"/><rect x="0" y="5" width="9" height="1.5" rx="1"/><rect x="0" y="9" width="11" height="1.5" rx="1"/></svg>
      </Btn>
      <Btn title="가운데 정렬" active={editor?.isActive({ textAlign: 'center' })} disabled={off}
        onClick={e => cmd(e, () => editor!.chain().setTextAlign('center').run())}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor"><rect x="0" y="1" width="13" height="1.5" rx="1"/><rect x="2" y="5" width="9" height="1.5" rx="1"/><rect x="1" y="9" width="11" height="1.5" rx="1"/></svg>
      </Btn>
      <Btn title="오른쪽 정렬" active={editor?.isActive({ textAlign: 'right' })} disabled={off}
        onClick={e => cmd(e, () => editor!.chain().setTextAlign('right').run())}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor"><rect x="0" y="1" width="13" height="1.5" rx="1"/><rect x="4" y="5" width="9" height="1.5" rx="1"/><rect x="2" y="9" width="11" height="1.5" rx="1"/></svg>
      </Btn>
      <Sep />

      {/* 글자 색 */}
      <button title="글자 색" disabled={off}
        onMouseDown={e => { e.preventDefault(); colorRef.current?.click(); }}
        className="px-1.5 py-1 rounded text-[12px] text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition select-none disabled:opacity-40 flex flex-col items-center leading-none gap-0.5">
        <span style={{ color: currentColor }}>A</span>
        <span style={{ display: 'block', width: 14, height: 3, background: currentColor, borderRadius: 1 }} />
      </button>
      <input ref={colorRef} type="color" defaultValue="#1e293b" className="sr-only"
        onChange={e => editor?.chain().setColor(e.target.value).run()} />

      {/* 형광펜 */}
      <button title="형광펜 배경색" disabled={off}
        onMouseDown={e => { e.preventDefault(); highlightRef.current?.click(); }}
        className="px-1.5 py-1 rounded text-[12px] text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition select-none disabled:opacity-40 flex flex-col items-center leading-none gap-0.5">
        <span>H</span>
        <span style={{ display: 'block', width: 14, height: 3, background: '#fde047', borderRadius: 1 }} />
      </button>
      <input ref={highlightRef} type="color" defaultValue="#fde047" className="sr-only"
        onChange={e => editor?.chain().toggleHighlight({ color: e.target.value }).run()} />
      <Sep />

      {/* 목록 */}
      <Btn title="글머리 기호" active={editor?.isActive('bulletList')} disabled={off}
        onClick={e => cmd(e, () => editor!.chain().toggleBulletList().run())}>•≡</Btn>
      <Btn title="번호 목록" active={editor?.isActive('orderedList')} disabled={off}
        onClick={e => cmd(e, () => editor!.chain().toggleOrderedList().run())}>1≡</Btn>
      <Sep />

      {/* 인용 / 코드 */}
      <Btn title="인용구" active={editor?.isActive('blockquote')} disabled={off}
        onClick={e => cmd(e, () => editor!.chain().toggleBlockquote().run())}>❝</Btn>
      <Btn title="코드 블록" active={editor?.isActive('codeBlock')} disabled={off}
        onClick={e => cmd(e, () => editor!.chain().toggleCodeBlock().run())}>{`</>`}</Btn>
      <Sep />

      {/* 표 삽입 */}
      <Btn title="표 삽입 (3행×3열)" active={false} disabled={off}
        onClick={e => cmd(e, () => editor!.chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}>
        ⊞ 표
      </Btn>
      <Sep />

      {/* 구분선 */}
      <Btn title="구분선" active={false} disabled={off}
        onClick={e => cmd(e, () => editor!.chain().setHorizontalRule().run())}>—</Btn>

      {/* 링크 */}
      {onLinkClick && (
        <button onMouseDown={e => { e.preventDefault(); onLinkClick(); }}
          className="text-[12px] px-2 py-0.5 rounded text-blue-600 hover:bg-blue-50 border border-blue-200 ml-0.5 transition select-none">
          🔗 링크
        </button>
      )}

      {/* 이미지 */}
      {onImageUpload && (
        <button onMouseDown={e => { e.preventDefault(); onImageUpload(); }}
          className="text-[12px] px-2 py-0.5 rounded text-blue-600 hover:bg-blue-50 border border-blue-200 ml-0.5 transition select-none">
          🖼 이미지
        </button>
      )}
    </div>
  );
}
