import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { CardCategory } from '../../types/log';
import type { ShiftCard } from '../../types/shiftLog';
import { dayLabel } from '../../utils/shiftText';
import { CardEditForm } from './CardEditForm';
import { CardLinkDialog } from './CardLinkDialog';
import { Empty, Panel } from './Panel';
import { ShiftCardRow } from './ShiftCardViews';
import { ShiftChip } from './ShiftBadges';

interface Props {
  cards: ShiftCard[];
  onOpenThread: (id: number) => void;
  extra?: ReactNode;
  /** 수정·삭제를 쓰려면 아래를 모두 넘긴다 (안 넘기면 보기 전용). onEditingDirty 는 바뀌지 않는 함수여야 한다 */
  meId?: number;
  categories?: CardCategory[];
  onChanged?: () => void;
  onEditingDirty?: (dirty: boolean) => void;
  /** 지난 근무를 보고 있으면 어느 근무인지 머리글에 표시 */
  pastLabel?: { date: string; shift: string } | null;
  /** 카드를 다시 불러오지 못한 상태 — 수정 중인 카드가 목록에 없어도 '삭제됨'으로 보지 않는다 */
  loadFailed?: boolean;
}

const noDirty = () => {};
const focusSoon = (id: string) => window.setTimeout(() => document.getElementById(id)?.focus(), 0);

/** 이 근무의 카드 — 분류별로 한 줄씩 접어서 보여준다. 전달·메모는 제외. 카드 하나를 제자리에서 수정·삭제할 수 있다. */
export function ShiftCardsPanel({ cards, onOpenThread, extra, meId, categories = [], onChanged, onEditingDirty, pastLabel, loadFailed }: Props) {
  const [openAll, setOpenAll] = useState<{ open: boolean; n: number }>({ open: false, n: 0 });
  const [editing, setEditing] = useState<ShiftCard | null>(null);   // 수정을 시작할 때의 카드 (목록이 다시 불러와져도 수정 중 내용 기준은 그대로)
  const [linkCard, setLinkCard] = useState<ShiftCard | null>(null); // 과제 연결 대화상자용
  const [keepOpen, setKeepOpen] = useState<number | null>(null);   // 방금 고친 카드는 펼친 채 둔다
  const [flashId, setFlashId] = useState<number | null>(null);
  const timer = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // 수정 중인 카드는 다시 불러온 목록이 비었거나 그 카드가 없어도 같은 분류·같은 자리에 그대로 둔다 (폼이 다시 만들어져 입력이 사라지지 않게)
  const base = cards.filter(c => c.kind !== 'memo');
  const gone = editing !== null && !base.some(c => c.id === editing.id);
  const list = editing && gone ? [...base, editing] : base.map(c => c.id === editing?.id ? editing : c);
  const canEdit = meId !== undefined && !!onChanged;
  const groups = new Map<string, { color: string | null; items: ShiftCard[] }>();
  list.forEach(c => {
    const key = c.category_name ?? '미분류';
    if (!groups.has(key)) groups.set(key, { color: c.category_color, items: [] });
    groups.get(key)!.items.push(c);
  });
  const toggle = (open: boolean) => { setKeepOpen(null); setOpenAll(s => ({ open, n: s.n + 1 })); };
  const editForm = (card: ShiftCard) => (
    <CardEditForm key={`edit-${card.id}`} card={card} meId={meId!} categories={categories} deleted={gone && !loadFailed} stale={gone && !!loadFailed} onChanged={onChanged!}
      onDirty={onEditingDirty ?? noDirty} onClose={saved => closeEdit(card.id, saved)} onDeleted={afterDelete} onOpenThread={onOpenThread} />
  );

  function closeEdit(id: number, saved: boolean) {
    setEditing(null);
    if (saved) {
      setKeepOpen(id); setFlashId(id);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setFlashId(null), 1500);
    }
    focusSoon(`sc-edit-${id}`);
  }

  function afterDelete(id: number) {   // 같은 분류의 다음 줄, 없으면 이전 줄, 그것도 없으면 패널 머리글로 포커스
    const items = [...groups.values()].find(g => g.items.some(c => c.id === id))?.items ?? [];
    const i = items.findIndex(c => c.id === id);
    const next = items[i + 1] ?? items[i - 1];
    setEditing(null);
    focusSoon(next ? `sc-edit-${next.id}` : 'shift-cards-title');
  }

  return (<>
    <Panel
      title={<span id="shift-cards-title" tabIndex={-1} className="outline-none">이 근무의 카드 <span className="text-[12px] font-semibold text-slate-400">{base.length}장</span>
        {pastLabel && <span className="ml-2 inline-flex items-center gap-1 text-[12px] font-semibold text-slate-500">{dayLabel(pastLabel.date)} <ShiftChip shift={pastLabel.shift} /></span>}</span>}
      extra={<>
        {base.length > 0 && <button type="button" onClick={() => toggle(true)} className="text-[12px] font-semibold text-slate-500 hover:text-blue-600">모두 펼치기</button>}
        {base.length > 0 && <button type="button" onClick={() => toggle(false)} className="text-[12px] font-semibold text-slate-500 hover:text-blue-600">모두 접기</button>}
        {extra}
      </>}
    >
      {list.length === 0 ? <Empty>아직 카드가 없습니다. 위의 ‘새 카드 작성’에서 첫 기록을 남겨 보세요.</Empty> : (
        <div className="pb-1.5">
          {[...groups.entries()].map(([name, g]) => (
            <div key={name}>
              <div className="flex items-center gap-2 px-4 pb-1 pt-2.5 text-[12px] font-extrabold text-slate-500">
                <span className="h-2 w-2 rounded-full" style={{ background: g.color ?? '#94a3b8' }} />{name}
                <span className="font-semibold text-slate-400">{g.items.length}</span>
              </div>
              {g.items.map(c => c.id === editing?.id && canEdit ? editForm(c) : (
                <ShiftCardRow key={`${c.id}-${openAll.n}-${keepOpen === c.id}`} card={c} onOpenThread={onOpenThread}
                  onLinkToThread={canEdit ? (card) => setLinkCard(card) : undefined}
                  defaultOpen={openAll.open || keepOpen === c.id} highlight={canEdit ? flashId === c.id : undefined}
                  onEdit={canEdit ? () => setEditing(c) : undefined} editLocked={editing !== null} />
              ))}
            </div>
          ))}
        </div>
      )}
    </Panel>
    {linkCard && <CardLinkDialog cards={[linkCard]} onClose={() => setLinkCard(null)}
      onLinked={() => { setLinkCard(null); onChanged?.(); }} />}
    </>
  );
}
