import type { ShiftCard } from '../../types/shiftLog';
import { AttachmentList } from './AttachmentViews';

interface Props {
  card: ShiftCard;
  totalUsers: number;
  inbox?: boolean;
  meId?: number;
  busy?: boolean;
  onCheck?: (cardId: number) => void;
}

const KEEP_LABEL: Record<string, string> = { checked: '확인할 때까지', shift: '다음 근무에만', days: '7일간' };
const TYPE_SHORT: Record<string, string> = { '전달사항': '전달', '행정/문서 관리': '행정' };

function targetLabel(card: ShiftCard): string {
  const m = card.memo!;
  if (m.target_type === 'next') return '다음 근무';
  if (m.target_type === 'all') return '근무자 전원';
  return m.target_user_name ?? '지정 사용자';
}

function statusLabel(card: ShiftCard, totalUsers: number): string {
  const m = card.memo!;
  if (m.target_type === 'all') return `확인 ${m.checked_names.length}/${totalUsers}명`;
  return m.checked_names.length ? `✓ ${m.checked_names.join('·')} 확인` : '미확인';
}

/** 전달·메모 한 줄. 받은 전달사항이면 확인 버튼을 단다. */
export function MemoRow({ card, totalUsers, inbox = false, meId, busy, onCheck }: Props) {
  if (!card.memo) return null;
  const checkedByMe = meId !== undefined && card.memo.checked_user_ids.includes(meId);
  return (
    <div className={`flex items-start gap-2 border-b border-slate-100 py-1.5 text-[13px] last:border-0 dark:border-slate-700/60 ${inbox && checkedByMe ? 'opacity-50' : ''}`}>
      <span className="mt-0.5 shrink-0 rounded px-1.5 text-[11px] font-extrabold text-white" style={{ background: card.category_color ?? '#0891b2' }}>
        {TYPE_SHORT[card.category_name ?? ''] ?? '기타'}
      </span>
      <div className="min-w-0 flex-1 text-slate-700 dark:text-slate-200">
        <div className="[overflow-wrap:anywhere]">{card.title}</div>
        <AttachmentList items={card.attachments} />
        <div className="mt-0.5 text-[11px] text-slate-400">
          {inbox && `${card.date.slice(5)} ${card.shift_type} · ${card.author_name ?? '-'} → `}
          {targetLabel(card)} · {KEEP_LABEL[card.memo.keep]}{card.memo.keep_until ? ` (${card.memo.keep_until.slice(5)}까지)` : ''} · {statusLabel(card, totalUsers)}
        </div>
      </div>
      {inbox && (checkedByMe
        ? <span className="shrink-0 text-[12px] text-slate-400">확인함</span>
        : <button type="button" disabled={busy} onClick={() => onCheck?.(card.id)}
            className="shrink-0 rounded-md border border-slate-200 px-2 py-0.5 text-[12px] font-bold hover:bg-blue-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200">확인</button>)}
    </div>
  );
}
