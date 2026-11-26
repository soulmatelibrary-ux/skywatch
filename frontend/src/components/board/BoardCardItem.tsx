import type { BoardCard, CardStatusItem } from '../../types/log';

interface Props {
  card: BoardCard;
  statuses: CardStatusItem[];
  onOpen: () => void;
  onStatusChange: (cardId: number, status: string) => void;
  selected?: boolean;
  onToggleSelect?: (cardId: number) => void;
}

export function BoardCardItem({ card, statuses, onOpen, onStatusChange, selected = false, onToggleSelect }: Props) {
  const statusItem = statuses.find(s => s.key === card.status);
  const color = statusItem?.color ?? '#6b7280';
  const isDone = card.status === 'done';

  return (
    <div
      onClick={onOpen}
      className="group relative cursor-pointer rounded-lg border bg-white p-2.5 transition-all duration-150 hover:shadow-md dark:bg-slate-900"
      style={{ borderLeftWidth: 4, borderLeftColor: color, borderColor: `${color}33` }}
    >
      {onToggleSelect && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onToggleSelect(card.id);
          }}
          className={`absolute left-2 top-2 inline-flex h-4.5 w-4.5 items-center justify-center rounded border text-[10px] transition ${
            selected
              ? 'border-blue-500 bg-blue-500 text-white'
              : 'border-slate-300 bg-white text-transparent shadow-sm hover:border-blue-400 dark:border-slate-600 dark:bg-slate-950'
          }`}
          aria-label="카드 선택"
        >
          ✓
        </button>
      )}
      <div className={`mb-1.5 line-clamp-1 text-[13px] font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${onToggleSelect ? 'pl-6' : ''}`}>
        {card.title}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] text-slate-400 dark:text-slate-500">
          {card.log_date}
          {card.last_edited_by_name ? ` · ${card.last_edited_by_name}` : ''}
        </span>
        <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          {card.handover_count}회
        </span>
      </div>

      {!isDone && (
        <div
          className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100"
          onClick={e => e.stopPropagation()}
        >
          {statuses
            .filter(s => s.key !== card.status && s.key !== 'cancelled' && s.key !== 'open' && s.key !== 'pending')
            .map(s => (
              <button
                key={s.key}
                onClick={() => onStatusChange(card.id, s.key)}
                className="rounded border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                {s.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
