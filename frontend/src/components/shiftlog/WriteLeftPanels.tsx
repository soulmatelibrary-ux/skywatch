import type { CSSProperties } from 'react';
import type { MissingShift, ShiftCard, ShiftType, WorkThread } from '../../types/shiftLog';
import { V2_OUTLINE } from '../common/v2Styles';
import { dayLabel } from '../../utils/shiftText';
import { Empty, Panel, PhaseSteps } from './Panel';
import { ShiftChip, ThreadStatusChip } from './ShiftBadges';

interface MissingProps {
  items: MissingShift[];
  meId: number;
  onPick: (date: string, shift: ShiftType) => void;
}

export function MissingPanel({ items, meId, onPick }: MissingProps) {
  return (
    <Panel title="작성 안 된 근무" extra={<span className="text-[12px] font-semibold text-slate-400">최근 7일{items.length ? ` · ${items.length}건` : ''}</span>}>
      {items.length === 0 ? <Empty>빠진 근무가 없습니다.</Empty> : (
        <div className="max-h-[320px] overflow-auto px-4 py-1">
          {items.map(m => (
            <div key={`${m.date}-${m.shift_type}`} className="flex items-center gap-2 border-b border-slate-100 py-2 text-[13px] last:border-0 dark:border-slate-700/60">
              <ShiftChip shift={m.shift_type} />
              <div className="min-w-0 flex-1">
                <b className="text-slate-800 dark:text-slate-100">{dayLabel(m.date)}</b> <span className="text-slate-400">{m.team}조</span>
                {m.workers.some(w => w.user_id === meId) && <span className="ml-1 rounded bg-blue-50 px-1.5 text-[11px] font-bold text-blue-600 dark:bg-blue-900/40">내 근무</span>}
                <div className="truncate text-[12px] text-slate-500">{m.workers.map(w => w.name).join('·')}</div>
              </div>
              <button type="button" onClick={() => onPick(m.date, m.shift_type)} className={`rounded-md border border-slate-200 px-2 py-0.5 text-[12px] font-bold hover:bg-blue-50 dark:border-slate-600 dark:text-slate-200 ${V2_OUTLINE}`}>작성</button>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

interface ThreadProps {
  threads: WorkThread[];
  cards: ShiftCard[];
  busy: boolean;
  onWrite: (thread: WorkThread) => void;
  onOpen: (id: number) => void;
  onClose: (id: number) => void;
  onFindClosed: () => void;
}

export function OpenThreadsPanel({ threads, cards, busy, onWrite, onOpen, onClose, onFindClosed }: ThreadProps) {
  const written = new Set(cards.map(c => c.thread_id));
  const ongoing = threads.filter(t => t.kind === 'thread');
  const projects = threads.filter(t => t.kind === 'project');
  const item = (t: WorkThread) => (
    <div key={t.id} style={{ '--edge': t.category_color ?? '#94a3b8' } as CSSProperties}
      className={`mb-2 rounded-lg border bg-slate-50 px-3 py-2 dark:bg-slate-900 v2:rounded-md v2:border-l-4 v2:border-l-[var(--edge)] v2:bg-[var(--v2-panel)] ${written.has(t.id) ? 'border-green-400' : 'border-slate-200 dark:border-slate-700 v2:border-[var(--v2-line)]'}`}>
      {t.kind === 'thread' && (
        <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
          <span className="h-2 w-2 rounded-full" style={{ background: t.category_color ?? '#94a3b8' }} />
          <ThreadStatusChip status={t.status} />{t.owner_name}
        </div>
      )}
      <button type="button" onClick={() => onOpen(t.id)} className="mt-0.5 text-left text-[13px] font-bold text-slate-800 hover:text-blue-600 dark:text-slate-100">{t.title}</button>
      {t.kind === 'project' ? <PhaseSteps phases={t.phases} current={t.current_phase} /> : t.last_card && (
        <div className="mt-0.5 text-[12px] text-slate-500">
          {t.last_card.date.slice(5)} {t.last_card.shift_type} · {t.last_card.next_step ? `다음 할 일: ${t.last_card.next_step}` : t.last_card.summary}
        </div>
      )}
      <div className="mt-1.5 flex items-center gap-1.5">
        {written.has(t.id)
          ? <span className="text-[12px] font-bold text-green-600">✓ 이 근무에 기록함</span>
          : <button type="button" onClick={() => onWrite(t)} className={`rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[12px] font-bold hover:bg-blue-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 ${V2_OUTLINE}`}>＋ {t.kind === 'project' ? '진행 기록' : '이어서 쓰기'}</button>}
        <span className="flex-1" />
        {t.kind === 'thread' && <button type="button" disabled={busy} onClick={() => onClose(t.id)} title="종료해도 [종료된 일 찾기]에서 다시 이어 쓸 수 있습니다" className="text-[12px] text-slate-400 hover:text-green-600">✓ 종료</button>}
      </div>
    </div>
  );
  return (
    <>
      <Panel title="🔗 이어받은 일" className="mb-4" extra={<>
        <button type="button" onClick={onFindClosed} title="이미 종료한 일도 찾아서 다시 이어 쓸 수 있습니다"
          className="mr-2 text-[12px] font-bold text-blue-600 hover:underline dark:text-blue-400">종료된 일 찾기</button>
        <span className="text-[12px] font-semibold text-slate-400">{ongoing.length}건</span></>}>
        <div className="px-3 pt-3">{ongoing.length ? ongoing.map(item) : <Empty>이어받은 일이 없습니다. 끝난 일을 다시 잇으려면 [종료된 일 찾기]를 누르세요.</Empty>}</div>
      </Panel>
      <Panel title="📌 장기 과제" extra={<span className="text-[12px] font-semibold text-slate-400">근무자 전원 참여</span>}>
        <div className="px-3 pt-3">{projects.length ? projects.map(item) : <Empty>진행 중인 장기 과제가 없습니다.</Empty>}</div>
      </Panel>
    </>
  );
}
