import { useEffect, useMemo, useState } from 'react';
import { useClosedThreads } from '../../hooks/useClosedThreads';
import type { WorkThread } from '../../types/shiftLog';
import { CategoryPill } from './ShiftBadges';

interface Props {
  onResume: (thread: WorkThread) => void;
  onOpen: (id: number) => void;
  onClose: () => void;
  /** 지난 기록 서랍이 위에 열려 있는 동안에는 Esc 가 서랍만 닫게 한다 */
  escDisabled?: boolean;
}

const BTN = 'rounded-md border border-slate-200 px-2 py-0.5 text-[12px] font-bold hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800';

/** 종료된 이어지는 일을 찾아 다시 이어 쓴다. 새 카드를 저장하면 '이어받은 일'로 돌아온다. */
export function ThreadResumeDialog({ onResume, onOpen, onClose, escDisabled = false }: Props) {
  const closed = useClosedThreads();
  const [query, setQuery] = useState('');
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !escDisabled) onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose, escDisabled]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return closed.data
      .filter(t => !q || `${t.title} ${t.owner_name ?? ''} ${t.category_name ?? ''}`.toLowerCase().includes(q))
      .sort((a, b) => (b.closed_on ?? '').localeCompare(a.closed_on ?? ''));
  }, [closed.data, query]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4" onClick={onClose}>
      <div role="dialog" aria-label="종료된 일 찾기" onClick={e => e.stopPropagation()}
        className="flex max-h-[80vh] w-[min(600px,100%)] flex-col rounded-xl bg-white shadow-xl dark:bg-[#1e293b]">
        <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-700">
          <div className="flex items-center">
            <h2 className="flex-1 text-[16px] font-extrabold text-slate-800 dark:text-slate-100">종료된 일 찾기</h2>
            <button type="button" onClick={onClose} aria-label="닫기" className="text-slate-400 hover:text-slate-700">✕</button>
          </div>
          <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">끝난 일도 다시 이어 쓸 수 있습니다. 새 카드를 저장하면 '이어받은 일'로 돌아옵니다.</p>
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="제목·시작한 사람·분류로 찾기"
            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" />
        </div>
        <div className="flex-1 overflow-auto px-5 py-3">
          {closed.isLoading && <div className="py-6 text-center text-[13px] text-slate-400">불러오는 중...</div>}
          {!closed.isLoading && items.length === 0 && (
            <div className="py-6 text-center text-[13px] text-slate-400">{closed.data.length ? '찾는 일이 없습니다.' : '종료된 일이 없습니다.'}</div>
          )}
          {items.map(t => (
            <div key={t.id} style={{ borderLeftColor: t.category_color ?? '#94a3b8' }}
              className="mb-2 rounded-lg border border-l-4 border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
                <CategoryPill color={t.category_color} name={t.category_name} />
                종료 {t.closed_on ?? '-'} · 기록 {t.card_count}건{t.owner_name ? ` · 시작 ${t.owner_name}` : ''}
              </div>
              <div className="mt-0.5 text-[13px] font-bold text-slate-800 dark:text-slate-100">{t.title}</div>
              {t.last_card && (
                <div className="mt-0.5 text-[12px] text-slate-500">
                  마지막 {t.last_card.date.slice(5)} {t.last_card.shift_type} · {t.last_card.next_step ? `다음 할 일: ${t.last_card.next_step}` : t.last_card.summary}
                </div>
              )}
              <div className="mt-1.5 flex gap-1.5">
                <button type="button" onClick={() => onResume(t)}
                  className="rounded-md bg-blue-600 px-2 py-0.5 text-[12px] font-bold text-white hover:bg-blue-700">↻ 이어서 쓰기</button>
                <button type="button" onClick={() => onOpen(t.id)} className={BTN}>지난 기록 보기</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
