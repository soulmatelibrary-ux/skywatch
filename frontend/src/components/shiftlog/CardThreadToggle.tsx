import type { ShiftCard } from '../../types/shiftLog';
import { V2_SEG_OFF, V2_SEG_ON } from '../common/v2Styles';
import { Band, BTN } from './CardEditNotices';

interface Props {
  card: ShiftCard;
  chain: boolean;
  disabled: boolean;
  onChange: (chain: boolean) => void;
  onOpenThread?: (id: number) => void;
}

/** 안내 문구 — 서버(shift_card_edit_service)가 하는 일과 같아야 한다 */
function notice(card: ShiftCard, chain: boolean): string | null {
  const was = card.kind === 'thread';
  const t = card.thread_title ?? '';
  const n = card.thread_card_count ?? 1;
  const done = card.thread_status === 'done';
  if (chain === was) {
    if (!was) return null;
    return done ? `종료된 일 ‘${t}’ 의 카드입니다.` : `이 카드는 ${n}장으로 이어진 일 ‘${t}’ 의 카드입니다.`;
  }
  if (chain) return '저장하면 이 카드로 새 이어지는 일이 만들어지고 카드는 진행중이 됩니다. 다음 근무가 ‘이어받은 일’에서 이어 씁니다.';
  if (n <= 1) return `이 카드 하나뿐인 일입니다. 저장하면 ‘${t}’ 일이 종료되고 카드는 완료가 됩니다.`;
  const rest = done ? '그대로 종료된 채 남습니다' : card.thread_status === 'hold' ? '계속 보류입니다' : '계속 진행중입니다';
  return `‘${t}’ 은 ${n}장으로 이어진 일입니다. 이 카드만 일에서 빼서 완료로 바꾸고, 나머지 ${n - 1}장은 ${rest}.`;
}

/** [ 당일 종료 | 🔗 다음 근무로 이어짐 ] — 초기값은 현재 카드. 장기 과제 카드는 바꿀 수 없다. */
export function CardThreadToggle({ card, chain, disabled, onChange, onOpenThread }: Props) {
  const project = card.kind === 'project';
  const sole = card.kind === 'thread' && card.thread_status === 'done' && (card.thread_card_count ?? 1) <= 1;
  const off = disabled || project || sole;
  const seg = (on: boolean, label: string) => (
    <button type="button" disabled={off} aria-pressed={chain === on} onClick={() => onChange(on)}
      className={`min-h-[32px] px-3 text-[12px] font-bold disabled:cursor-not-allowed disabled:opacity-60 ${chain === on ? `bg-blue-600 text-white ${V2_SEG_ON}` : `bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-300 ${V2_SEG_OFF}`}`}>{label}</button>
  );
  const text = project ? `📌 장기 과제 ‘${card.thread_title}’ 의 카드입니다. 이어짐 설정은 과제 화면에서 바꿉니다.`
    : sole ? `종료된 일 ‘${card.thread_title}’ 의 하나뿐인 카드입니다.` : notice(card, chain);
  return (
    <div className="space-y-1.5">
      <div role="group" aria-label="이어짐 설정" className="inline-flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600 v2:rounded-md v2:border-[var(--v2-line)]">
        {seg(false, '당일 종료')}{seg(true, '🔗 다음 근무로 이어짐')}
      </div>
      {text && (
        <Band tone="info" actions={project && card.thread_id && onOpenThread
          ? <button type="button" className={BTN} onClick={() => onOpenThread(card.thread_id!)}>과제 열기</button> : null}>ⓘ {text}</Band>
      )}
    </div>
  );
}
