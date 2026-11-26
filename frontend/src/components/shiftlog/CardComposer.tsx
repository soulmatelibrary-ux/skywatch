import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import type { CardCategory } from '../../types/log';
import type { ShiftCardInput, WorkThread } from '../../types/shiftLog';
import { useUIStore } from '../../store/uiStore';
import { textToHtml } from '../../utils/shiftText';
import { CardEditor } from '../logs/CardEditor';
import { AttachmentPicker } from './AttachmentViews';
import { MiniToolbar } from './MiniToolbar';
import { V2_PRIMARY } from '../common/v2Styles';
import { EDITOR_BOX, INPUT } from './editorBox';

/** 과제 "이어서 쓰기"·정기 업무 "작성"으로 입력창을 채울 때 매번 새 객체로 넘긴다. */
export interface ComposerPrefill {
  threadId: number | null;
  title: string;
  body: string;
}

interface Props {
  categories: CardCategory[];
  threads: WorkThread[];
  prefill: ComposerPrefill | null;
  busy: boolean;
  disabled: boolean;
  onSubmit: (body: Omit<ShiftCardInput, 'date' | 'shift_type'>, files: File[]) => Promise<boolean>;
}

/** 새 카드 — 본문은 기존 업무일지와 같은 편집기(한글·엑셀 표 붙여넣기, 이미지 붙여넣기). */
export function CardComposer({ categories, threads, prefill, busy, disabled, onSubmit }: Props) {
  const defaultCat = categories.find(c => c.name === '기타')?.id ?? null;
  const [threadId, setThreadId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [html, setHtml] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [newThread, setNewThread] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [uploadingImages, setUploadingImages] = useState(0);
  const [titleError, setTitleError] = useState(false);
  const addToast = useUIStore(s => s.addToast);
  const titleRef = useRef<HTMLInputElement>(null);
  const onEditor = useCallback((e: Editor | null) => setEditor(e), []);
  const noop = useCallback(() => {}, []);

  useEffect(() => {
    if (!prefill) return;
    const t = threads.find(x => x.id === prefill.threadId);
    // 목록의 '작성' 동작으로 들어온 외부 선택을 현재 작성 초안에 동기화한다.
    /* eslint-disable react-hooks/set-state-in-effect */
    setThreadId(prefill.threadId);
    setTitle(prefill.title);
    setTitleError(false);
    setNewThread(false);
    if (t) setCategoryId(t.category_id);
    editor?.commands.setContent(textToHtml(prefill.body));
    if (prefill.title) editor?.commands.focus('end'); else titleRef.current?.focus();
    /* eslint-enable react-hooks/set-state-in-effect */
    // threads·editor는 바뀔 때마다 반영하지 않고 prefill이 바뀔 때만 반영한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  // 과제 목록이 늦게 도착해도 연결된 과제의 분류로 맞춘다 (과제 보드 → ?thread= 진입)
  useEffect(() => {
    if (threadId === null || categoryId !== null) return;
    const t = threads.find(x => x.id === threadId);
    // URL로 먼저 들어온 과제 정보가 늦게 도착하면 해당 분류를 한 번 반영한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (t) setCategoryId(t.category_id);
  }, [threads, threadId, categoryId]);

  function pickThread(id: number | null) {
    setThreadId(id);
    const t = threads.find(x => x.id === id);
    if (t) { setCategoryId(t.category_id); setNewThread(false); }
  }

  async function submit() {
    if (!title.trim()) { setTitleError(true); titleRef.current?.focus(); return; }
    const text = editor?.getText({ blockSeparator: '\n' }) ?? '';
    const ok = await onSubmit({
      title: title.trim(), body: text, content: editor?.getHTML() ?? html,
      category_id: categoryId ?? defaultCat, thread_id: threadId, new_thread: !threadId && newThread,
    }, files);
    if (ok) {
      setTitle(''); setThreadId(null); setNewThread(false); setCategoryId(null); setFiles([]);
      setTitleError(false);
      editor?.commands.clearContent(); setHtml('');
    }
  }

  const ongoing = threads.filter(t => t.kind === 'thread');
  const projects = threads.filter(t => t.kind === 'project');
  return (
    <div className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap gap-2">
        <select value={threadId ?? ''} aria-label="연결할 과제 선택" onChange={e => pickThread(e.target.value ? Number(e.target.value) : null)} className={`${INPUT} max-w-[300px]`}>
          <option value="">일회성 카드 (과제 연결 안 함)</option>
          {ongoing.length > 0 && <optgroup label="🔗 이어받은 일">{ongoing.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</optgroup>}
          {projects.length > 0 && <optgroup label="📌 장기 과제">{projects.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</optgroup>}
        </select>
        <input ref={titleRef} value={title} onChange={e => { setTitle(e.target.value); if (e.target.value.trim()) setTitleError(false); }} maxLength={255}
          aria-invalid={titleError} aria-describedby={titleError ? 'shift-card-title-error' : undefined}
          placeholder={threadId ? '이번 근무에 한 일 · 예) 2차 시험 결과' : '제목 · 예) 레이더 표출 지연 재발 확인'} className={`${INPUT} min-w-[200px] flex-1 ${titleError ? 'border-red-400 ring-2 ring-red-100 dark:border-red-500 dark:ring-red-950' : ''}`} />
      </div>
      {titleError && <div id="shift-card-title-error" role="alert" className="text-[12px] font-semibold text-red-600 dark:text-red-300">카드 제목을 입력해 주세요.</div>}
      <MiniToolbar editor={editor} />
      <div className={EDITOR_BOX}>
        <CardEditor initialContent="" onUpdate={setHtml} onFocus={noop} onEditor={onEditor} onPendingImageCountChange={setUploadingImages} />
      </div>
      {!html.replace(/<[^>]+>/g, '').trim() && !/<(table|img)/i.test(html) && (
        <div className="-mt-1 text-[11px] text-slate-400">예) 조치: 무엇을 했는지 / 결과: 어떻게 되었는지 / 다음: 다음 근무가 이어서 할 일</div>
      )}
      <AttachmentPicker files={files} onChange={setFiles} onReject={m => addToast(m, 'warning')} />
      <div className="flex flex-wrap items-center gap-2">
        <select value={categoryId ?? defaultCat ?? ''} aria-label="카드 분류" onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : null)} className={INPUT}>
          {categories.filter(c => c.is_active && c.name !== '전달사항').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {!threadId && (
          <label className="flex items-center gap-1.5 text-[12px] font-bold text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={newThread} onChange={e => setNewThread(e.target.checked)} /> 🔗 다음 근무로 이어짐
          </label>
        )}
        <span className="flex-1" />
        {uploadingImages > 0 && <span className="text-[12px] text-amber-600">이미지 올리는 중...</span>}
        {!title.trim() && <span className="text-[11px] text-slate-400">제목을 입력하면 저장할 수 있습니다.</span>}
        <button type="button" onClick={submit} disabled={busy || disabled || uploadingImages > 0}
          className={`min-h-9 rounded-lg bg-blue-600 px-4 py-1.5 text-[13px] font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 ${V2_PRIMARY}`}>카드 저장</button>
      </div>
    </div>
  );
}
