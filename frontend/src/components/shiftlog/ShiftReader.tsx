import { useEffect, useState } from 'react';
import type { ShiftCard, ShiftView } from '../../types/shiftLog';
import { useAuthStore } from '../../store/authStore';
import { useShiftCardEdit } from '../../hooks/useShiftCardEdit';
import { isFutureShift } from '../../utils/shiftNav';
import { currentShift, dayLabel, displayTitle, nextSteps } from '../../utils/shiftText';
import { V2_OUTLINE } from '../common/v2Styles';
import { CardDeleteConfirm } from './CardDeleteConfirm';
import { MemoRow } from './MemoRow';
import { ShiftCardRow } from './ShiftCardViews';
import { ShiftReaderHead } from './ShiftReaderHead';
import type { ReadNav } from './ShiftReaderHead';

interface Props {
  view: ShiftView;
  totalUsers: number;
  onWrite: () => void;
  onOpenLegacy: (logId: number) => void;
  onOpenThread: (id: number) => void;
  nav: ReadNav;
  /** 카드 검색에서 넘어온 카드 — 펼치고 그 위치로 이동해 잠시 강조 */
  focusCardId?: number | null;
  onFocusDone?: () => void;
  /** 삭제 후 목록 새로고침 */
  onReload?: () => void;
}

/** 찾기 칸 — 제목·본문·분류·작성자·과제 이름에 검색어가 들어 있는지 (대소문자 무시) */
const hit = (c: ShiftCard, word: string) =>
  [c.title, c.body_text, c.category_name, c.author_name, c.thread_title].join(' ').toLowerCase().includes(word);

const isNow = (v: ShiftView) => { const c = currentShift(); return v.date === c.date && v.shift_type === c.shift; };

/** 근무 하나의 일지 전체 — 근무자·작성자·지연 정보, 분류 목차, 전달·메모, 다음 할 일, 카드. */
export function ShiftReader({ view, totalUsers, onWrite, onOpenLegacy, onOpenThread, nav, focusCardId = null, onFocusDone, onReload }: Props) {
  const [fold, setFold] = useState({ open: true, n: 0 });
  const [q, setQ] = useState('');
  const meId = useAuthStore(s => s.currentUser?.id ?? 0);
  const [delCard, setDelCard] = useState<ShiftCard | null>(null);
  const { busy: delBusy, remove: delRemove } = useShiftCardEdit(onReload ?? (() => {}));
  const word = focusCardId ? '' : q.trim().toLowerCase();   // 카드로 이동하는 동안은 찾기 거르기를 잠시 풀어 그 카드가 보이게 한다
  const notFound = !!focusCardId && !view.cards.some(c => c.id === focusCardId);
  useEffect(() => {
    if (!focusCardId) return;
    document.getElementById(`sc-${focusCardId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const t = setTimeout(() => onFocusDone?.(), notFound ? 6000 : 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusCardId, view]);
  const allCards = view.cards.filter(c => c.kind !== 'memo');
  const allMemos = view.cards.filter(c => c.kind === 'memo');
  const cards = word ? allCards.filter(c => hit(c, word)) : allCards;
  const memos = word ? allMemos.filter(c => hit(c, word)) : allMemos;
  const steps = cards.flatMap(c => nextSteps(c.body_text).map(s => ({ c, s })));
  const groups = new Map<string, { color: string | null; items: ShiftCard[] }>();
  cards.forEach(c => {
    const k = c.category_name ?? '미분류';
    if (!groups.has(k)) groups.set(k, { color: c.category_color, items: [] });
    groups.get(k)!.items.push(c);
  });
  const jump = (k: string) => document.getElementById(`rs-${k}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#1e293b]">
      <ShiftReaderHead view={view} nav={nav} onWrite={onWrite} onOpenLegacy={onOpenLegacy} />
      {notFound && <div role="status" className="px-5 pt-3 text-[13px] text-amber-700 dark:text-amber-300">찾던 카드가 이 근무에 없습니다(삭제되었을 수 있습니다).</div>}
      {view.cards.length > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-white px-5 py-2 dark:border-slate-700 dark:bg-[#1e293b]">
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="이 근무에서 찾기" aria-label="이 근무의 카드에서 찾기"
            className="w-[180px] rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[12px] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100" />
          {word && <span className="text-[12px] font-semibold text-blue-600 dark:text-blue-400">{cards.length + memos.length}건 일치</span>}
          {cards.length > 0 && <span className="text-[12px] text-slate-400">목차</span>}
          {[...groups.entries()].map(([k, g]) => (
            <button key={k} type="button" onClick={() => jump(k)} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-0.5 text-[12px] font-bold hover:border-blue-400 dark:border-slate-600 dark:text-slate-200">
              <span className="h-2 w-2 rounded-full" style={{ background: g.color ?? '#94a3b8' }} />{k} {g.items.length}
            </button>
          ))}
          <span className="flex-1" />
          <button type="button" onClick={() => setFold(f => ({ open: false, n: f.n + 1 }))} className="text-[12px] text-slate-500">모두 접기</button>
          <button type="button" onClick={() => setFold(f => ({ open: true, n: f.n + 1 }))} className="text-[12px] text-slate-500">모두 펼치기</button>
        </div>
      )}
      {memos.length > 0 && (
        <div className="px-5 pt-3"><h3 className="mb-1 text-[14px] font-bold dark:text-slate-100">📨 전달·메모</h3>{memos.map(m => <div key={m.id} id={`sc-${m.id}`}><MemoRow card={m} totalUsers={totalUsers} /></div>)}</div>
      )}
      {steps.length > 0 && (
        <div className="px-5 pt-3">
          <h3 className="mb-1.5 text-[14px] font-bold dark:text-slate-100">➡️ 다음 근무가 이어서 할 일 <span className="text-[12px] text-slate-400">{steps.length}건</span></h3>
          {steps.map(({ c, s }, i) => (
            <div key={`${c.id}-${i}`} className="mb-1.5 flex items-baseline gap-2 text-[13px] dark:text-slate-200">
              <span className="h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full" style={{ background: c.category_color ?? '#94a3b8' }} />
              <span><span className="font-semibold">{s}</span> <span className="text-[12px] text-slate-400">· {displayTitle(c.title, c.body_text)}</span></span>
            </div>
          ))}
        </div>
      )}
      {[...groups.entries()].map(([k, g]) => (
        <div key={k} id={`rs-${k}`} className="scroll-mt-12 pt-3">
          <h3 className="flex items-center gap-2 px-5 pb-1 text-[14px] font-bold dark:text-slate-100">
            <span className="h-2 w-2 rounded-full" style={{ background: g.color ?? '#94a3b8' }} />{k} <span className="text-[12px] text-slate-400">{g.items.length}장</span>
          </h3>
          {g.items.map(c => <ShiftCardRow key={`${c.id}-${fold.n}`} card={c} defaultOpen={fold.open || c.id === focusCardId} highlight={c.id === focusCardId} onOpenThread={onOpenThread}
            onDelete={onReload ? setDelCard : undefined} />)}
        </div>
      ))}
      {word && cards.length + memos.length === 0 && (
        <div className="px-5 py-8 text-center text-[13px] text-slate-400">
          이 근무에 "{q.trim()}"이(가) 들어간 카드가 없습니다. 다른 근무를 고르거나, 전체 기간은 "카드 검색" 탭에서 찾으세요.
        </div>
      )}
      {view.cards.length === 0 && (
        <div className="px-5 py-10 text-center text-[13px] text-slate-400">
          {isFutureShift(view.date, view.shift_type) ? '아직 시작하지 않은 근무입니다.' : '이 근무의 일지가 없습니다.'}
          <div className="mt-3">
            {isNow(view)
              ? <button type="button" onClick={onWrite} className="rounded-lg bg-blue-600 px-4 py-1.5 font-bold text-white">지금 작성하기</button>
              : <button type="button" onClick={onWrite} className={`rounded-lg border border-slate-300 px-4 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 ${V2_OUTLINE}`}>{dayLabel(view.date)} {view.shift_type} 일지 쓰기</button>}
          </div>
        </div>
      )}
      {delCard && (
        <div className="px-5 pb-3">
          <CardDeleteConfirm card={delCard} other={delCard.author_id !== meId} busy={delBusy}
            onCancel={() => setDelCard(null)} onConfirm={async () => { const r = await delRemove(delCard.id); if (r.ok) setDelCard(null); }} />
        </div>
      )}
      <div className="h-3" />
    </div>
  );
}
