import type { ShiftCard, ShiftView } from '../../types/shiftLog';
import { displayTitle, nextSteps } from '../../utils/shiftText';
import { MemoRow } from './MemoRow';
import { Empty, Panel } from './Panel';
import { V2_OUTLINE } from '../common/v2Styles';

interface InboxProps {
  items: ShiftCard[];
  meId: number;
  totalUsers: number;
  busy: boolean;
  onCheck: (cardId: number) => void;
}

export function InboxPanel({ items, meId, totalUsers, busy, onCheck }: InboxProps) {
  const unread = items.filter(c => !c.memo?.checked_user_ids.includes(meId)).length;
  return (
    <Panel title="📨 받은 전달사항" className="mb-4"
      extra={<span className={`text-[12px] font-semibold ${unread ? 'text-red-500' : 'text-slate-400'}`}>{unread ? `미확인 ${unread}건` : items.length ? '모두 확인' : ''}</span>}>
      {items.length === 0 ? <Empty>받은 전달사항이 없습니다.</Empty> : (
        <div className="px-4 py-1">
          {items.map(c => <MemoRow key={c.id} card={c} inbox meId={meId} totalUsers={totalUsers} busy={busy} onCheck={onCheck} />)}
        </div>
      )}
    </Panel>
  );
}

export function HandoverPanel({ handover, onOpenRead }: { handover: ShiftView['handover']; onOpenRead: (date: string, shift: string) => void }) {
  const cards = (handover?.cards ?? []).filter(c => c.kind !== 'memo');
  const steps = cards.flatMap(c => nextSteps(c.body_text).map(s => ({ c, s })));
  return (
    <Panel title="이전 근무 인계" className="mb-4"
      extra={handover && <span className="text-[12px] font-semibold text-slate-400">{handover.date.slice(5)} {handover.shift_type}{handover.team && ` · ${handover.team}조`}</span>}>
      {!handover ? <Empty>이전 근무 일지가 없습니다.</Empty> : (
        <div className="px-4 py-3">
          {steps.length > 0 && <div className="mb-1.5 text-[12px] font-bold text-slate-500">이어서 할 일 {steps.length}건</div>}
          {steps.map(({ c, s }, i) => (
            <div key={`${c.id}-${i}`} className="mb-2 flex gap-2 text-[12px]">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c.category_color ?? '#94a3b8' }} />
              <div>
                <div className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{s}</div>
                <div className="text-slate-500">{displayTitle(c.title, c.body_text)}{c.thread_id ? ' · 🔗' : ''}</div>
              </div>
            </div>
          ))}
          <div className="text-[12px] text-slate-500">
            전체 카드 {cards.length}장 ·{' '}
            <button type="button" className="text-blue-600 underline" onClick={() => onOpenRead(handover.date, handover.shift_type)}>읽기 화면에서 보기</button>
          </div>
        </div>
      )}
    </Panel>
  );
}

export function RoutinePanel({ routines, onWrite }: { routines: ShiftView['routines']; onWrite: (title: string, body: string) => void }) {
  return (
    <Panel title="정기 업무" extra={<span className="text-[12px] font-semibold text-slate-400">{routines.filter(r => r.done).length}/{routines.length}</span>}>
      {routines.length === 0 ? <Empty>오늘 해당하는 정기 업무가 없습니다.</Empty> : (
        <div className="px-4 py-1">
          {routines.map(r => (
            <div key={r.title} className="flex items-center gap-2 border-b border-slate-100 py-2 text-[13px] last:border-0 dark:border-slate-700/60">
              <span className={`inline-flex h-[18px] w-[18px] items-center justify-center rounded border-2 text-[11px] text-white ${r.done ? 'border-green-600 bg-green-600' : 'border-slate-300'}`}>{r.done ? '✓' : ''}</span>
              <span className="flex-1 text-slate-700 dark:text-slate-200">{r.title}</span>
              {r.done ? <span className="text-[12px] text-slate-400">작성됨</span>
                : <button type="button" onClick={() => onWrite(r.title, r.body)} className={`rounded-md border border-slate-200 px-2 py-0.5 text-[12px] font-bold hover:bg-blue-50 dark:border-slate-600 dark:text-slate-200 ${V2_OUTLINE}`}>작성</button>}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
