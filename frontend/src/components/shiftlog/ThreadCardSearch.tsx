import { useState } from 'react';
import { useCardExplore } from '../../hooks/useCardExplore';
import { useUIStore } from '../../store/uiStore';
import { workThreadApi } from '../../services/api/workThreadApi';
import type { ShiftCard } from '../../types/shiftLog';
import { displayTitle } from '../../utils/shiftText';
import { ShiftChip } from './ShiftBadges';

interface Props {
  threadId: number;
  existingCardIds: number[];
  onLinked: () => void;
  onCancel: () => void;
}

const LINKABLE = new Set(['done', 'cancelled']);
const INPUT = 'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

/** 과제 상세 안에서 카드를 검색하여 바로 추가하는 패널. */
export function ThreadCardSearch({ threadId, existingCardIds, onLinked, onCancel }: Props) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const addToast = useUIStore(s => s.addToast);

  // 검색어가 2자 이상일 때만 API 호출 (빈 검색어로 전체 조회 방지)
  const hasQuery = q.trim().length >= 2;
  const { data, isLoading } = useCardExplore(hasQuery ? { q } : { q: '__empty__' });

  // 완료 카드만, 이미 연결된 카드 제외, 메모/프로젝트 제외
  const exclude = new Set(existingCardIds);
  const candidates = hasQuery ? data.items.filter(
    c => LINKABLE.has(c.status) && c.kind !== 'memo' && c.kind !== 'project' && !exclude.has(c.id),
  ) : [];

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      await workThreadApi.linkCards({ card_ids: [...selected], thread_id: threadId });
      addToast(`카드 ${selected.size}장을 추가했습니다.`, 'success');
      onLinked();
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      addToast(detail ?? '추가하지 못했습니다. 다시 시도해 주세요.', 'error');
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-slate-200 px-5 py-3 dark:border-slate-700">
      <div className="mb-2 text-[13px] font-extrabold text-slate-700 dark:text-slate-200">카드 검색하여 추가</div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="제목·내용으로 검색" className={INPUT} autoFocus />
      <div className="mt-2 max-h-[200px] overflow-auto">
        {isLoading && <p className="py-3 text-center text-[12px] text-slate-400">찾는 중...</p>}
        {!isLoading && candidates.length === 0 && (
          <p className="py-3 text-center text-[12px] text-slate-400">
            {hasQuery ? '조건에 맞는 완료 카드가 없습니다.' : '두 글자 이상 입력하세요.'}
          </p>
        )}
        {candidates.map(c => (
          <Row key={c.id} card={c} checked={selected.has(c.id)} onToggle={() => toggle(c.id)} />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button type="button" disabled={selected.size === 0 || busy} onClick={() => void submit()}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-[13px] font-bold text-white hover:bg-blue-700 disabled:opacity-50">
          {busy ? '추가 중…' : `선택 ${selected.size}장 추가`}
        </button>
        <button type="button" disabled={busy} onClick={onCancel}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">
          취소
        </button>
      </div>
    </div>
  );
}

function Row({ card, checked, onToggle }: { card: ShiftCard; checked: boolean; onToggle: () => void }) {
  return (
    <label className={`mb-1 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px] ${
      checked ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'}`}>
      <input type="checkbox" checked={checked} onChange={onToggle} className="h-3.5 w-3.5 accent-blue-600" />
      <span className="shrink-0 tabular-nums text-slate-500">{card.date.slice(5)}</span>
      <ShiftChip shift={card.shift_type} />
      <span className="min-w-0 flex-1 truncate text-slate-800 dark:text-slate-100">{displayTitle(card.title, card.body_text)}</span>
      {card.thread_id && <span className="shrink-0 text-[11px] text-amber-600 dark:text-amber-400">다른 묶음에서 이동</span>}
    </label>
  );
}
