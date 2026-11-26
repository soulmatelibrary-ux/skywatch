import type { ShiftCard } from '../../types/shiftLog';
import { SHIFT_STYLE, THREAD_STATUS_LABEL } from '../../utils/shiftText';

export function ShiftChip({ shift }: { shift: string }) {
  return (
    <span className={`inline-block rounded-md px-1.5 py-px text-[11px] font-semibold ${SHIFT_STYLE[shift] ?? SHIFT_STYLE['공지']}`}>
      {shift}
    </span>
  );
}

/** 분류 표시 — 분류 색은 연한 배경과 점으로만 쓴다. */
export function CategoryPill({ color, name }: { color: string | null; name: string | null }) {
  const c = color ?? '#94a3b8';
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap text-slate-700 dark:text-slate-200"
      style={{ background: `${c}1f` }}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c }} />
      {name ?? '미분류'}
    </span>
  );
}

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300',
  hold: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  done: 'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300',
};

export function ThreadStatusChip({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-px text-[11px] font-extrabold ${STATUS_STYLE[status] ?? ''}`}>
      {THREAD_STATUS_LABEL[status] ?? status}
    </span>
  );
}

const LINKABLE_STATUS = new Set(['done', 'cancelled']);

export function KindBadge({ card, onOpenThread, onLinkToThread }: {
  card: ShiftCard;
  onOpenThread?: (id: number) => void;
  onLinkToThread?: (card: ShiftCard) => void;
}) {
  if (card.kind === 'memo') {
    return <span className="rounded-md bg-cyan-50 px-1.5 py-px text-[11px] font-bold text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">📨 전달·메모</span>;
  }
  if (card.thread_id) {
    return (
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onOpenThread?.(card.thread_id!); }}
        className="max-w-[260px] truncate rounded-md bg-blue-50 px-1.5 py-px text-left text-[11px] font-bold text-blue-600 hover:underline dark:bg-blue-900/40 dark:text-blue-300"
      >
        {card.kind === 'project' ? '📌' : '🔗'} {card.thread_title}
      </button>
    );
  }
  if (onLinkToThread && LINKABLE_STATUS.has(card.status) && card.kind !== 'project') {
    return (
      <button type="button" onClick={e => { e.stopPropagation(); onLinkToThread(card); }}
        className="rounded-md bg-blue-50 px-1.5 py-px text-[11px] font-bold text-blue-600 hover:underline dark:bg-blue-900/40 dark:text-blue-300">
        🔗 과제 연결
      </button>
    );
  }
  return <span className="rounded-md bg-slate-100 px-1.5 py-px text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">당일 종료</span>;
}

export function FlagBadges({ card }: { card: ShiftCard }) {
  const written = new Date(card.created_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  return (
    <>
      {card.is_late && (
        <span title={`실제 작성 ${written}`} className="rounded-md bg-amber-50 px-1.5 py-px text-[11px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          지연 작성 {written}
        </span>
      )}
      {card.is_proxy && (
        <span title="근무자가 아닌 사람이 작성" className="rounded-md bg-amber-50 px-1.5 py-px text-[11px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          대리 작성
        </span>
      )}
    </>
  );
}
