import { useEffect, useMemo, useState } from 'react';
import { useAsyncData } from '../../hooks/useAsyncData';
import { workThreadApi } from '../../services/api/workThreadApi';
import type { ShiftCard, WorkThread, WorkThreadDetail } from '../../types/shiftLog';
import { displayTitle } from '../../utils/shiftText';
import { ThreadStatusChip } from './ShiftBadges';

interface Props {
  cards: ShiftCard[];
  onClose: () => void;
  onLinked: (thread: WorkThreadDetail) => void;
}

const SEG = (on: boolean) => `px-3 py-1 text-[12px] font-bold ${on ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-300'}`;
const INPUT = 'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

/** 고른 카드를 한 묶음으로 연결한다 (새 묶음 만들기 또는 기존 묶음에 추가). */
export function CardLinkDialog({ cards, onClose, onLinked }: Props) {
  const newest = [...cards].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)[0];
  const [mode, setMode] = useState<'new' | 'existing'>(cards.length === 1 ? 'existing' : 'new');
  const [title, setTitle] = useState(() => displayTitle(newest.title, newest.body_text));
  const [query, setQuery] = useState('');
  const [threadId, setThreadId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const threads = useAsyncData<WorkThread[]>(
    async () => (mode === 'existing' ? (await workThreadApi.list({ kind: 'thread' })).data.data ?? [] : []), [mode], [],
  );
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose, busy]);

  // 이미 다른 묶음에 있는 카드는 이쪽으로 옮겨진다 (고른 묶음에 이미 있는 카드는 제외)
  const moving = cards.filter(c => c.thread_id && !(mode === 'existing' && c.thread_id === threadId));
  const locked = cards.filter(c => c.kind === 'project');        // 장기 과제 기록은 옮기지 않는다
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads.data.filter(t => !q || t.title.toLowerCase().includes(q));
  }, [threads.data, query]);
  const targetVisible = threadId !== null && shown.some(t => t.id === threadId);  // 검색으로 가려진 묶음에는 묶지 않는다
  const ready = !busy && locked.length === 0 && (mode === 'new' ? title.trim().length > 0 && cards.length >= 2 : targetVisible);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const res = await workThreadApi.linkCards(mode === 'new'
        ? { card_ids: cards.map(c => c.id), title: title.trim() }
        : { card_ids: cards.map(c => c.id), thread_id: threadId ?? undefined });
      if (res.data.data) { onLinked(res.data.data); return; }
      setError('묶었는지 확인하지 못했습니다. 목록을 새로 고쳐 확인해 주세요.');
      setBusy(false);
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : '묶지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4" onClick={() => !busy && onClose()}>
      <div role="dialog" aria-label="카드 묶기" onClick={e => e.stopPropagation()}
        className="flex max-h-[85vh] w-[min(560px,100%)] flex-col rounded-xl bg-white shadow-xl dark:bg-[#1e293b]">
        <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-700">
          <h2 className="text-[16px] font-extrabold text-slate-800 dark:text-slate-100">카드 {cards.length}장 묶기</h2>
          <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">묶어 두면 어느 카드에서든 같은 묶음의 이력을 함께 볼 수 있습니다.</p>
        </div>
        <div className="flex-1 space-y-3 overflow-auto px-5 py-3">
          <ul className="max-h-32 overflow-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[12px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {cards.map(c => <li key={c.id} className="truncate">{c.date.slice(5)} {c.shift_type} · {displayTitle(c.title, c.body_text)}</li>)}
          </ul>
          {locked.length > 0 && <p className="text-[12px] text-red-500">장기 과제에 기록된 카드({locked.length}장)는 묶을 수 없습니다. 선택에서 빼 주세요.</p>}
          {moving.length > 0 && locked.length === 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-1.5 text-[12px] text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              {moving.length}장은 이미 다른 묶음(예: '{moving[0].thread_title}')에 있어, 묶으면 이쪽으로 옮겨집니다.
            </p>
          )}
          <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">
            <button type="button" className={SEG(mode === 'new')} onClick={() => setMode('new')}>새 묶음 만들기</button>
            <button type="button" className={SEG(mode === 'existing')} onClick={() => setMode('existing')}>기존 묶음에 추가</button>
          </div>
          {mode === 'new' ? (
            <div>
              <label className="mb-1 block text-[12px] text-slate-500 dark:text-slate-400">묶음 이름</label>
              <input value={title} onChange={e => setTitle(e.target.value)} maxLength={255} className={INPUT} autoFocus />
              {cards.length < 2 && <p className="mt-1 text-[12px] text-red-500">새 묶음은 카드를 두 장 이상 골라야 합니다.</p>}
            </div>
          ) : (
            <div>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="묶음 이름으로 찾기" className={INPUT} autoFocus />
              <div className="mt-2 max-h-48 overflow-auto">
                {threads.isLoading && <p className="py-3 text-center text-[12px] text-slate-400">불러오는 중...</p>}
                {!threads.isLoading && shown.length === 0 && <p className="py-3 text-center text-[12px] text-slate-400">찾는 묶음이 없습니다.</p>}
                {shown.map(t => (
                  <label key={t.id} className={`mb-1 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] ${threadId === t.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                    <input type="radio" name="thread" checked={threadId === t.id} onChange={() => setThreadId(t.id)} className="accent-blue-600" />
                    <span className="min-w-0 flex-1 truncate text-slate-800 dark:text-slate-100">{t.kind === 'project' ? '📌 ' : ''}{t.title}</span>
                    <ThreadStatusChip status={t.status} /><span className="text-[11px] text-slate-400">{t.card_count}장</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {error && <p className="text-[12px] text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-700">
          <button type="button" disabled={busy} onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-1.5 text-[13px] text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">취소</button>
          <button type="button" disabled={!ready} onClick={() => void submit()}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-[13px] font-bold text-white hover:bg-blue-700 disabled:opacity-50">{busy ? '묶는 중…' : '묶기'}</button>
        </div>
      </div>
    </div>
  );
}
