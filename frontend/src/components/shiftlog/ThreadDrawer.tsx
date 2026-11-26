import { useEffect, useState } from 'react';
import { useThreadDetail } from '../../hooks/useThreadDetail';
import type { ShiftCard, WorkThread } from '../../types/shiftLog';
import { openLogPopup } from '../../utils/openLogPopup';
import { dayLabel, displayTitle } from '../../utils/shiftText';
import { AttachmentList } from './AttachmentViews';
import { CardBody } from './CardBody';
import { PhaseSteps } from './Panel';
import { CategoryPill, FlagBadges, ShiftChip, ThreadStatusChip } from './ShiftBadges';
import { ThreadCardSearch } from './ThreadCardSearch';

interface Props {
  threadId: number;
  onClose: () => void;
  onChanged?: () => void;
  onWrite?: (thread: WorkThread) => void;
}

const BTN = 'rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-bold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800';

function Timeline({ cards, onUnlink }: { cards: ShiftCard[]; onUnlink?: (card: ShiftCard) => void }) {
  if (!cards.length) return <div className="text-[12px] text-slate-400">아직 기록이 없습니다.</div>;
  return (
    <div className="relative pl-5 before:absolute before:bottom-1 before:left-[6px] before:top-1 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
      {cards.map(c => (
        <div key={c.id} className="relative mb-3.5 before:absolute before:-left-[19px] before:top-1.5 before:h-3 before:w-3 before:rounded-full before:border-[3px] before:border-blue-600 before:bg-white">
          <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-500">
            <b className="text-slate-700 dark:text-slate-200">{dayLabel(c.date)}</b><ShiftChip shift={c.shift_type} />작성 {c.author_name ?? '-'}<FlagBadges card={c} />
            <button type="button" onClick={() => openLogPopup(c.log_id, c.id)}
              className="ml-auto font-bold text-blue-600 hover:underline dark:text-blue-400">원래 일지 열기</button>
            {onUnlink && <button type="button" onClick={() => onUnlink(c)} className="text-slate-400 hover:text-red-500" title="이 카드를 묶음에서 뺍니다 (카드는 지워지지 않습니다)">묶음에서 빼기</button>}
          </div>
          <div className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
            <div className="text-[13px] font-semibold text-slate-800 [overflow-wrap:anywhere] dark:text-slate-100">{displayTitle(c.title, c.body_text)}</div>
            <CardBody text={c.body_text} html={c.content} clamp />
            <AttachmentList items={c.attachments} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** 과제 상세 — 근무별 진행 기록. 장기 과제는 단계별로 묶어서 보여준다. */
export function ThreadDrawer({ threadId, onClose, onChanged, onWrite }: Props) {
  const { thread: t, busy, setStatus, nextPhase, copyNextYear, unlinkCard } = useThreadDetail(threadId, onChanged);
  const [showSearch, setShowSearch] = useState(false);
  const unlink = (c: ShiftCard) => { if (!busy && confirm(`'${displayTitle(c.title, c.body_text)}' 카드를 이 묶음에서 뺄까요?\n카드 자체는 지워지지 않습니다.`)) void unlinkCard(c.id); };
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
  const isProj = t?.kind === 'project';
  const inPhase = (c: ShiftCard, p: { start_month: string; end_month: string }) => c.date.slice(0, 7) >= p.start_month && c.date.slice(0, 7) <= p.end_month;
  const byPhase = isProj ? t!.phases.map((p, i) => ({ p, i, cards: t!.cards.filter(c => inPhase(c, p)) })).reverse() : [];
  const outside = isProj ? t!.cards.filter(c => !t!.phases.some(p => inPhase(c, p))) : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/35" onClick={onClose}>
      <aside className="flex h-full w-[min(640px,100vw)] flex-col bg-white dark:bg-[#1e293b]" onClick={e => e.stopPropagation()}>
        {!t ? <div className="p-6 text-[13px] text-slate-400">불러오는 중...</div> : (<>
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <div className="flex items-center gap-2 text-[12px]">
              <CategoryPill color={t.category_color} name={t.category_name} />
              <span className="rounded-md bg-blue-50 px-1.5 font-bold text-blue-600 dark:bg-blue-900/40">{isProj ? '📌 장기 과제' : '🔗 이어지는 일'}</span>
              <ThreadStatusChip status={t.status} /><span className="flex-1" />
              <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="닫기">✕</button>
            </div>
            <div className="my-1.5 text-[18px] font-extrabold text-slate-800 dark:text-slate-100">{t.title}</div>
            <div className="text-[12px] text-slate-500">
              {isProj ? `기록한 사람 ${t.author_count}명` : `시작 ${t.owner_name ?? '-'}`} · 시작일 {t.started_on} · 근무 기록 {t.card_count}건
              {t.recur_month ? ` · 매년 ${t.recur_month}월 반복` : ''}
            </div>
            {isProj && <PhaseSteps phases={t.phases} current={t.current_phase} />}
          </div>
          <div className="flex-1 overflow-auto px-5 py-4">
            {isProj ? byPhase.map(({ p, i, cards }) => (
              <div key={`${p.name}-${i}`} className="mb-2">
                <div className="mb-2 text-[13px] font-extrabold text-slate-700 dark:text-slate-200">{p.name} <span className="font-semibold text-slate-400">· 기록 {cards.length}건</span></div>
                <Timeline cards={cards} />
              </div>
            )) : <Timeline cards={t.cards} onUnlink={unlink} />}
            {outside.length > 0 && (
              <div className="mb-2">
                <div className="mb-2 text-[13px] font-extrabold text-slate-700 dark:text-slate-200">단계 기간 밖 기록 <span className="font-semibold text-slate-400">· {outside.length}건</span></div>
                <Timeline cards={outside} />
              </div>
            )}
          </div>
          {showSearch && !isProj && (
            <ThreadCardSearch threadId={threadId} existingCardIds={t.cards.map(c => c.id)}
              onLinked={() => { setShowSearch(false); onChanged?.(); }} onCancel={() => setShowSearch(false)} />
          )}
          <div className="flex flex-wrap gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-700">
            {onWrite && (t.status !== 'done' || !isProj) && (isProj || t.card_count > 0) && (
              <button type="button" className="rounded-lg bg-blue-600 px-3 py-1.5 text-[13px] font-bold text-white" onClick={() => onWrite(t)}>
                {t.status === 'done' ? '↻ 다시 열고 이어서 쓰기' : '＋ 이 근무에 기록'}</button>
            )}
            {!isProj && <button type="button" className={BTN} onClick={() => setShowSearch(v => !v)}>{showSearch ? '검색 닫기' : '＋ 카드 추가'}</button>}
            {isProj && t.status !== 'done' && t.current_phase < t.phases.length - 1 && <button type="button" disabled={busy} className={BTN} onClick={nextPhase}>다음 단계로 · {t.phases[t.current_phase + 1].name}</button>}
            {t.status !== 'done' && <button type="button" disabled={busy} className={BTN} onClick={() => setStatus('done')}>✓ {isProj ? '과제 종료' : '종료'}</button>}
            {!isProj && t.status === 'open' && <button type="button" disabled={busy} className={BTN} onClick={() => setStatus('hold')}>보류</button>}
            {t.status !== 'open' && <button type="button" disabled={busy} className={BTN} onClick={() => setStatus('open')}>다시 진행</button>}
            {isProj && <button type="button" disabled={busy} className={BTN} onClick={copyNextYear}>＋ 다음 해 과제로 복사</button>}
          </div>
        </>)}
      </aside>
    </div>
  );
}
