import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { ShiftCard } from '../../types/shiftLog';
import { V2_ROW } from '../common/v2Styles';
import { dayLabel, displayTitle, firstLine } from '../../utils/shiftText';
import { AttachmentList } from './AttachmentViews';
import { CardBody } from './CardBody';
import { AuthorLine, EditButton, EditedLabel } from './CardEditMeta';
import { CategoryPill, FlagBadges, KindBadge, ShiftChip } from './ShiftBadges';

interface Props {
  card: ShiftCard;
  onOpenThread?: (id: number) => void;
  /** 완료 카드를 과제에 연결하는 버튼 콜백 */
  onLinkToThread?: (card: ShiftCard) => void;
  showWhen?: boolean;
  defaultOpen?: boolean;
  /** 카드 묶기 선택 모드: onToggle 이 있으면 체크박스를 보여 준다 */
  selected?: boolean;
  onToggle?: () => void;
  /** 이 카드의 근무 일지 보기 주소 (카드 검색 결과용) */
  shiftLink?: string;
  /** 카드 검색에서 넘어온 카드 강조 */
  highlight?: boolean;
  /** 쓰기 화면 카드 수정: onEdit 이 있으면 ✎ 수정 버튼과 수정 이력을 보여 준다. editLocked 는 다른 카드를 수정 중일 때 */
  onEdit?: (id: number) => void;
  editLocked?: boolean;
  /** 읽기 화면 카드 삭제 (수정 없이 삭제만) */
  onDelete?: (card: ShiftCard) => void;
}

const LINK_CLS = 'shrink-0 rounded px-1.5 py-0.5 text-[12px] font-semibold text-blue-600 hover:bg-blue-50 hover:underline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-blue-400 dark:hover:bg-slate-800 v2:text-[var(--v2-accent)] v2:hover:bg-[var(--v2-accent-soft)]';

function ShiftLink({ card, to }: { card: ShiftCard; to: string }) {
  const t = `이 근무 일지 보기: ${dayLabel(card.date)} ${card.shift_type}`;
  return <Link to={to} title={t} aria-label={t} onClick={e => e.stopPropagation()} className={LINK_CLS}>일지 보기 ›</Link>;
}

function PickBox({ checked, onToggle, title }: { checked: boolean; onToggle: () => void; title: string }) {
  return <input type="checkbox" checked={checked} onChange={onToggle} onClick={e => e.stopPropagation()}
    aria-label={`묶을 카드로 선택: ${title}`} className="h-4 w-4 shrink-0 cursor-pointer accent-blue-600" />;
}

/** 한 줄 카드 — 제목과 첫 줄만 보이고 누르면 펼쳐진다. 카드가 많은 일지용. */
export function ShiftCardRow({ card, onOpenThread, onLinkToThread, showWhen = false, defaultOpen = false, selected = false, onToggle, shiftLink, highlight, onEdit, editLocked = false, onDelete }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id={`sc-${card.id}`} className={`cursor-pointer border-t border-slate-100 px-4 py-2 hover:bg-blue-50/50 dark:border-slate-700/60 dark:hover:bg-slate-800/60 ${selected ? 'bg-blue-50 dark:bg-blue-900/20' : ''} ${V2_ROW} ${highlight === undefined ? '' : 'transition-colors duration-700 motion-reduce:transition-none'} ${highlight ? 'bg-amber-50 ring-2 ring-inset ring-amber-400 dark:bg-amber-900/25 v2:bg-[var(--v2-accent-soft)] v2:ring-[var(--v2-accent)]' : ''}`}
      style={{ '--edge': card.category_color ?? '#94a3b8' } as CSSProperties} onClick={() => setOpen(v => !v)}>
      <div className="flex min-w-0 items-center gap-2">
        {onToggle && <PickBox checked={selected} onToggle={onToggle} title={card.title} />}
        <span className="w-3 text-slate-400">{open ? '▾' : '▸'}</span>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: card.category_color ?? '#94a3b8' }} />
        {showWhen && <span className="flex shrink-0 items-center gap-1 text-[12px] text-slate-500">{card.date.slice(5)} <ShiftChip shift={card.shift_type} /></span>}
        <span className="max-w-[45%] shrink-0 truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">{displayTitle(card.title, card.body_text)}</span>
        {!open && <span className="min-w-0 flex-1 truncate text-[13px] text-slate-500">{firstLine(card.body_text)}</span>}
        {open && <span className="flex-1" />}
        {!open && card.attachments.length > 0 && <span className="shrink-0 text-[12px] text-slate-400">📎{card.attachments.length}</span>}
        {(card.kind !== 'single' || onLinkToThread) && <KindBadge card={card} onOpenThread={onOpenThread} onLinkToThread={onLinkToThread} />}
        <FlagBadges card={card} />
        {onEdit && <EditedLabel card={card} />}
        {shiftLink && <ShiftLink card={card} to={shiftLink} />}
        {onEdit && <EditButton card={card} onEdit={onEdit} locked={editLocked} compact />}
      </div>
      {open && (
        <div className="mt-2 rounded-lg v2:cursor-auto border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 v2:rounded-md v2:border-[var(--v2-line-soft)] v2:bg-[var(--v2-sub)]" onClick={e => e.stopPropagation()}>
          <CardBody text={card.body_text} html={card.content} />
          <AttachmentList items={card.attachments} />
          {onEdit ? <AuthorLine card={card} onEdit={onEdit} locked={editLocked} />
            : <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                <span>작성 {card.author_name ?? '-'}</span>
                {onDelete && <button type="button" onClick={() => onDelete(card)} className="text-red-500 hover:text-red-700 hover:underline dark:text-red-400">삭제</button>}
              </div>}
        </div>
      )}
    </div>
  );
}

/** 타일 카드 — 카드 탐색 그리드용. 얇은 테두리, 분류는 작은 표시로만. 긴 본문은 세 줄까지. */
export function ShiftCardTile({ card, onOpenThread, onLinkToThread, selected = false, onToggle, shiftLink }: Props) {
  return (
    <div className={`flex h-full flex-col gap-2 rounded-xl border p-4 transition hover:shadow-[0_6px_20px_-8px_rgba(15,23,42,0.18)] ${selected
      ? 'border-blue-500 bg-blue-50/60 dark:border-blue-400 dark:bg-blue-900/20'
      : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-[#1e293b] dark:hover:border-slate-600'}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        {onToggle && <PickBox checked={selected} onToggle={onToggle} title={card.title} />}
        <CategoryPill color={card.category_color} name={card.category_name} />
        <KindBadge card={card} onOpenThread={onOpenThread} onLinkToThread={onLinkToThread} />
        <FlagBadges card={card} />
      </div>
      <div className="text-[14.5px] font-semibold leading-snug tracking-[-0.01em] text-slate-900 [overflow-wrap:anywhere] dark:text-slate-50">{displayTitle(card.title, card.body_text)}</div>
      <CardBody text={card.body_text} html={card.content} clamp />
      <AttachmentList items={card.attachments} compact />
      <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5 text-[12px] text-slate-400 dark:border-slate-700/70">
        <span className="tabular-nums">{dayLabel(card.date)}</span><ShiftChip shift={card.shift_type} />
        {shiftLink && <ShiftLink card={card} to={shiftLink} />}
        <span className="ml-auto">{card.author_name ?? '-'}</span>
      </div>
    </div>
  );
}
