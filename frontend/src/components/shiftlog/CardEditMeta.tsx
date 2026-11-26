import type { ShiftCard } from '../../types/shiftLog';
import { V2_GHOST_BTN } from '../common/v2Styles';
import { stamp } from './editStamp';

/** 접힌 줄 오른쪽의 "수정 박OO 14:20" — 수정 이력이 있을 때만 */
export function EditedLabel({ card }: { card: ShiftCard }) {
  if (!card.edited_by_name || !card.edited_at) return null;
  return (
    <span title={`수정 ${card.edited_by_name} · ${new Date(card.edited_at).toLocaleString('ko-KR')}`}
      className="shrink-0 text-[11px] tabular-nums text-slate-400">수정 {card.edited_by_name} {stamp(card.edited_at)}</span>
  );
}

interface BtnProps {
  card: ShiftCard;
  onEdit: (id: number) => void;
  /** 다른 카드를 수정 중이면 막는다 */
  locked: boolean;
  /** 접힌 줄의 ✎ 버튼(true)과 펼친 상자 아래의 글자 버튼(false) */
  compact?: boolean;
}

export function EditButton({ card, onEdit, locked, compact = false }: BtnProps) {
  const label = `카드 수정: ${card.title}`;
  return (
    <button type="button" id={compact ? `sc-edit-${card.id}` : undefined} disabled={locked}
      title={locked ? '다른 카드를 수정 중입니다.' : label} aria-label={label}
      onClick={e => { e.stopPropagation(); onEdit(card.id); }}
      className={`inline-flex min-h-[32px] min-w-[44px] shrink-0 items-center justify-center gap-1 rounded-md border border-slate-200 px-2 text-[12px] font-semibold text-slate-600 hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:text-slate-300 ${compact ? '-my-1' : ''} ${V2_GHOST_BTN}`}>
      <span aria-hidden>✎</span><span className={compact ? 'max-[639px]:hidden' : ''}>수정</span>
    </button>
  );
}

/** 펼친 상자 아래 한 줄 — 작성자·수정 이력과 수정 버튼 */
export function AuthorLine({ card, onEdit, locked }: { card: ShiftCard; onEdit?: (id: number) => void; locked: boolean }) {
  const edited = card.edited_by_name && card.edited_at ? ` · 수정 ${card.edited_by_name} ${stamp(card.edited_at)}` : '';
  return (
    <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
      <span className="tabular-nums">작성 {card.author_name ?? '-'}{onEdit ? edited : ''}</span>
      <span className="flex-1" />
      {onEdit && <EditButton card={card} onEdit={onEdit} locked={locked} />}
    </div>
  );
}
