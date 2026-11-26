import type { ShiftCard } from '../../types/shiftLog';
import { BTN, BTN_DANGER, Band } from './CardEditNotices';

interface Props {
  card: ShiftCard;
  other: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** 삭제 확인 문구 — 서버(shift_card_edit_service.delete_card)가 하는 일과 같게 쓴다 */
function message(card: ShiftCard): string {
  const t = card.thread_title ?? '';
  const n = card.thread_card_count ?? 1;
  if (card.kind === 'project') return `장기 과제 ‘${t}’ 의 카드입니다. 삭제하면 과제 기록에서도 사라집니다.`;
  if (card.kind === 'thread' && n <= 1) return `이 카드는 이어지는 일 ‘${t}’ 의 하나뿐인 카드입니다. 삭제하면 그 일은 이어서 쓸 카드가 없어져 종료되고 목록에서 보이지 않습니다.`;
  if (card.kind === 'thread') return `이 카드는 ${n}장으로 이어진 일 ‘${t}’ 의 카드입니다. 삭제하면 그 일에서 빠지고, 나머지 ${n - 1}장은 ${card.thread_status === 'done' ? '그대로 남습니다' : '계속 이어집니다'}.`;
  return '이 카드를 삭제할까요?';
}

export function CardDeleteConfirm({ card, other, busy, onCancel, onConfirm }: Props) {
  return (
    <Band tone="red" actions={<>
      <button type="button" autoFocus className={BTN} onClick={onCancel}>취소</button>
      <button type="button" className={BTN_DANGER} disabled={busy} onClick={onConfirm}>{busy ? '삭제 중…' : '카드 삭제'}</button>
    </>}>
      {other && `${card.author_name ?? '다른 근무자'} 님이 쓴 카드입니다. `}{message(card)} 삭제한 카드는 이 화면에서 되살릴 수 없습니다.
    </Band>
  );
}
