import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Editor } from '@tiptap/core';
import { useShiftCardEdit } from '../../hooks/useShiftCardEdit';
import type { CardCategory } from '../../types/log';
import type { ShiftCard } from '../../types/shiftLog';
import { textToHtml } from '../../utils/shiftText';
import { V2_EDIT_BOX, V2_PRIMARY } from '../common/v2Styles';
import { CardEditor } from '../logs/CardEditor';
import { CardDeleteConfirm } from './CardDeleteConfirm';
import { CardEditBands } from './CardEditBands';
import { BTN, BTN_DANGER } from './CardEditNotices';
import { CardThreadToggle } from './CardThreadToggle';
import { EDITOR_BOX, INPUT } from './editorBox';
import { MiniToolbar } from './MiniToolbar';

interface Props {
  card: ShiftCard;
  meId: number;
  categories: CardCategory[];
  deleted?: boolean;   // 다른 곳에서 이미 삭제된 카드
  stale?: boolean;     // 카드 목록을 다시 불러오지 못한 상태 (입력은 그대로, 저장은 막지 않는다)
  onClose: (saved: boolean) => void;
  onDeleted: (id: number) => void;
  onDirty: (dirty: boolean) => void;   // 바뀌지 않는 함수여야 한다 (unmount 때 false 로 되돌린다)
  onChanged: () => void;
  onOpenThread?: (id: number) => void;
}

const SAVE_FAIL = '저장하지 못했습니다. 고친 내용은 그대로 있습니다. 다시 저장해 주세요.';

/** 카드 제자리 수정 상자 — 제목·분류·본문(표·이미지 포함)·이어짐 전환·삭제. 첨부는 여기서 바꾸지 않는다. */
export function CardEditForm({ card, meId, categories, deleted, stale, onClose, onDeleted, onDirty, onChanged, onOpenThread }: Props) {
  const { busy, update, remove } = useShiftCardEdit(onChanged);
  const wasChain = card.kind === 'thread';
  const [title, setTitle] = useState(card.title);
  const [cat, setCat] = useState(card.category_id);
  const [chain, setChain] = useState(wasChain);
  const [html, setHtml] = useState<string | null>(null);   // 편집기에서 고친 HTML (고치지 않았으면 null)
  const [base, setBase] = useState<string | null>(null);   // 열 때 편집기가 만든 HTML — 서버 원본과 비교하지 않는다
  const [editor, setEditor] = useState<Editor | null>(null);
  const [uploading, setUploading] = useState(0);
  const [titleErr, setTitleErr] = useState(false);
  const [ask, setAsk] = useState(false), [confirmed, setConfirmed] = useState(false);   // 남의 카드 저장 전 확인 띠 / 이번 수정에서 확인함
  const [conflict, setConflict] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [lost, setLost] = useState(false);
  const gone = lost || !!deleted;
  const [discard, setDiscard] = useState(false), [deleting, setDeleting] = useState(false);   // 내용 버리기 확인 / 삭제 확인 띠
  const titleRef = useRef<HTMLInputElement>(null), noop = useCallback(() => {}, []);
  const onEditor = useCallback((e: Editor | null) => { setEditor(e); if (e) setBase(b => b ?? e.getHTML()); }, []);
  const other = card.author_id !== meId;
  const writer = card.author_name ?? '다른 근무자';
  const bodyChanged = html !== null && html !== base;
  const dirty = title !== card.title || cat !== card.category_id || chain !== wasChain || bodyChanged;
  const options = categories.filter(c => c.is_active && c.name !== '전달사항');

  useEffect(() => { titleRef.current?.focus(); }, []);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  useEffect(() => { editor?.setEditable(!busy); }, [editor, busy]);
  useEffect(() => {
    if (!discard) return undefined;
    const id = window.setTimeout(() => setDiscard(false), 3000);
    return () => window.clearTimeout(id);
  }, [discard]);

  async function save(overwrite = false, sure = false) {
    if (!title.trim()) { setTitleErr(true); titleRef.current?.focus(); return; }
    if (other && !confirmed && !sure) { setAsk(true); return; }
    setAsk(false); setConflict(null); setErr(null);
    const r = await update(card.id, {
      title: title.trim(), category_id: cat, thread_mode: chain === wasChain ? 'keep' : chain ? 'thread' : 'single',
      ...(bodyChanged && editor ? { content: editor.getHTML() } : {}),
      // 수정 시작 시점의 값을 함께 보내, 상태 변경 등으로 updated_at 만 바뀐 경우는 충돌로 보지 않게 한다
      ...(overwrite ? {} : { expected_updated_at: card.updated_at, base_title: card.title, base_content: card.content ?? null, base_category_id: card.category_id }),
    });
    if (r.ok) onClose(true);
    else if (r.status === 409) setConflict(r.message ?? '그 사이 이 카드가 바뀌었습니다. 바뀐 내용을 확인한 뒤 다시 저장해 주세요.');
    else if (r.status === 404) setLost(true);
    else setErr(r.status === 400 && r.message ? r.message : SAVE_FAIL);
  }

  async function del() {
    const r = await remove(card.id);
    if (r.ok) onDeleted(card.id);
    else if (r.status === 404) { setDeleting(false); setLost(true); } else { setDeleting(false); setErr('삭제하지 못했습니다. 다시 시도해 주세요.'); }
  }

  const cancel = () => { if (!dirty || discard) onClose(false); else setDiscard(true); };
  // Ctrl+Enter·Ctrl+S 는 편집기보다 먼저(capture) 처리한다 — 안 그러면 편집기가 Ctrl+Enter 를 줄바꿈(<br>)으로 먼저 받아 본문에 끼어든다
  function onSaveKey(e: KeyboardEvent) {
    if (e.nativeEvent.isComposing || gone || !(e.ctrlKey || e.metaKey) || (e.key !== 'Enter' && e.key.toLowerCase() !== 's')) return;
    e.preventDefault(); e.stopPropagation();
    if (!busy && !uploading) void save();
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && !e.nativeEvent.isComposing && !gone) { e.preventDefault(); cancel(); }
  }

  return (
    <div onKeyDownCapture={onSaveKey} onKeyDown={onKey} aria-busy={busy} className={`mx-3 my-2 space-y-2 rounded-lg border border-blue-300 bg-blue-50/40 px-3 py-3 shadow-[inset_3px_0_0_var(--color-blue-500)] dark:border-blue-500/60 dark:bg-blue-900/10 ${V2_EDIT_BOX}`}>
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <span className="rounded-md bg-blue-600 px-2 py-0.5 font-bold text-white v2:bg-[var(--v2-accent)] v2:text-[var(--v2-accent-text)]">수정 중</span>
        <span className="flex-1" />
        {other ? <span className="rounded-md bg-amber-50 px-2 py-0.5 font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">{writer} 님이 쓴 카드</span>
          : <span className="text-slate-400">작성 {writer}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        <select value={cat ?? ''} aria-label="카드 분류" disabled={busy} onChange={e => setCat(e.target.value ? Number(e.target.value) : null)} className={INPUT}>
          {cat === null && <option value="">미분류</option>}
          {cat !== null && !options.some(c => c.id === cat) && <option value={cat}>{card.category_name ?? '분류'}</option>}
          {options.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input ref={titleRef} value={title} maxLength={255} disabled={busy} aria-label="카드 제목" aria-invalid={titleErr}
          onChange={e => { setTitle(e.target.value); if (e.target.value.trim()) setTitleErr(false); }}
          className={`${INPUT} min-w-[200px] flex-1 ${titleErr ? 'border-red-400 ring-2 ring-red-100 dark:border-red-500 dark:ring-red-950' : ''}`} />
      </div>
      {titleErr && <div role="alert" className="text-[12px] font-semibold text-red-600 dark:text-red-300">카드 제목을 입력해 주세요.</div>}
      <MiniToolbar editor={editor} />
      <div className={EDITOR_BOX}>
        <CardEditor key={card.id} initialContent={card.content ?? textToHtml(card.body_text)} onUpdate={setHtml} onFocus={noop} onEditor={onEditor} onPendingImageCountChange={setUploading} />
      </div>
      {card.attachments.length > 0 && <div className="text-[11px] text-slate-400">📎 첨부 {card.attachments.length}개 · 첨부는 여기서 바꿀 수 없습니다.</div>}
      <CardThreadToggle card={card} chain={chain} disabled={busy || gone} onChange={setChain} onOpenThread={onOpenThread} />
      <CardEditBands writer={writer} gone={gone} stale={!!stale} ask={ask} conflict={conflict} err={err} onClose={() => onClose(false)}
        onAskStay={() => setAsk(false)} onAskSave={() => { setConfirmed(true); setAsk(false); void save(false, true); }}
        onConflictStay={() => setConflict(null)} onOverwrite={() => void save(true)} />
      {deleting && <CardDeleteConfirm card={card} other={other} busy={busy} onCancel={() => setDeleting(false)} onConfirm={() => void del()} />}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy || deleting} onClick={() => setDeleting(true)} className="min-h-[32px] rounded-md px-2 text-[12px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-950/40">카드 삭제</button>
        <span className="flex-1" />
        {uploading > 0 && <span className="text-[12px] text-amber-600">이미지 올리는 중...</span>}
        {discard
          ? <><button type="button" className={BTN_DANGER} onClick={() => onClose(false)}>내용 버리기</button><button type="button" autoFocus className={BTN} onClick={() => setDiscard(false)}>계속 수정</button></>
          : <button type="button" className={BTN} disabled={busy} onClick={cancel}>취소</button>}
        <button type="button" disabled={busy || gone || uploading > 0} onClick={() => void save()}
          className={`min-h-[36px] rounded-lg bg-blue-600 px-4 text-[13px] font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 ${V2_PRIMARY}`}>{busy && !deleting ? '저장 중…' : '수정 저장'}</button>
        <span className="hidden text-[11px] text-slate-400 sm:inline">Ctrl+Enter</span>
      </div>
    </div>
  );
}
