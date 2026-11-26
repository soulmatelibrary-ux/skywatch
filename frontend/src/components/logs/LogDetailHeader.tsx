import type { CSSProperties } from 'react';
import type { LogDetail } from '../../types/log';
import { highlightMentions } from '../../utils/mentionHighlight';
import { V2_SHIFT_BAND } from '../common/v2Styles';
import { LogHeaderActions } from './LogHeaderActions';

const SHIFT_BADGE: Record<string, string> = {
  '주간': 'bg-amber-200  text-amber-900  dark:bg-amber-500  dark:text-white',
  '야간': 'bg-indigo-200 text-indigo-900 dark:bg-indigo-500 dark:text-white',
  '주야': 'bg-violet-200 text-violet-900 dark:bg-violet-500 dark:text-white',
  '비번': 'bg-slate-200  text-slate-700  dark:bg-slate-600  dark:text-slate-100',
  '휴가': 'bg-emerald-200 text-emerald-900 dark:bg-emerald-500 dark:text-white',
  '공지': 'bg-red-200    text-red-900    dark:bg-red-500    dark:text-white',
};

const ROLE_BADGE: Record<string, string> = {
  primary: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  sub: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  support: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  overtime: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
};

interface Props {
  detail: LogDetail;
  onToggleReadPanel: () => void;
  onToggleReferencePanel?: () => void;
  onClose: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  readCount: number;
  totalActiveUsers?: number;
  onDragStart?: (e: React.MouseEvent) => void;
  isAdmin?: boolean;
  isEditing?: boolean;
  referenceOpen?: boolean;
}

export function LogDetailHeader({
  detail,
  onToggleReadPanel,
  onToggleReferencePanel,
  onClose,
  onDelete,
  onEdit,
  readCount,
  totalActiveUsers,
  onDragStart,
  isEditing = false,
  referenceOpen = false,
}: Props) {
  const teamLabel = detail.team === 'day' ? '주간' : detail.team ? `${detail.team}팀` : '';

  return (
    <div
      onMouseDown={onDragStart}
      style={{ '--band': V2_SHIFT_BAND[detail.shift_type] } as CSSProperties}
      className={`px-6 py-1 border-b border-orange-200 dark:border-slate-700 flex items-center gap-3 shrink-0 select-none bg-orange-50 dark:bg-slate-800 v2:min-h-[44px] v2:border-[var(--v2-line)] v2:bg-[var(--v2-panel)] v2:shadow-[inset_4px_0_0_var(--band,transparent)] ${onDragStart ? 'cursor-grab' : ''}`}
    >
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <span className="text-[13px] text-orange-700 dark:text-orange-300 shrink-0 v2:text-[var(--v2-muted)] v2:tabular-nums">{detail.date}</span>
        <span data-shift={detail.shift_type} className={`v2-shift text-[13px] px-2 py-0.5 rounded font-semibold shrink-0 ${SHIFT_BADGE[detail.shift_type] ?? 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-200'}`}>
          {detail.shift_type}
        </span>
        {teamLabel && (
          <span className="text-[13px] font-bold text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-500/20 px-2 py-0.5 rounded shrink-0 v2:bg-[var(--v2-sub)] v2:text-[var(--v2-text)]">
            {teamLabel}
          </span>
        )}
        <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100 truncate v2:text-[var(--v2-text)]">
          {highlightMentions(detail.title, 'bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium dark:bg-orange-500/20 dark:text-orange-300 v2:bg-[var(--v2-accent-soft)] v2:text-[var(--v2-accent)]')}
        </span>
        {isEditing && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/70 dark:bg-slate-700/70 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-400/30 shrink-0 v2:border-[var(--v2-accent)] v2:bg-[var(--v2-accent-soft)] v2:text-[var(--v2-accent)]">
            수정 중
          </span>
        )}
        {detail.participants.length > 0 && (
          <>
            <span className="text-[13px] text-orange-700 dark:text-orange-300 shrink-0 v2:hidden">참여:</span>
            {detail.participants.map(p => (
              <span
                key={p.user_id}
                className={`text-[13px] font-medium px-2 py-0.5 rounded shrink-0 v2:hidden ${ROLE_BADGE[p.role] ?? 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'}`}
              >
                {p.name ?? `#${p.user_id}`}
              </span>
            ))}
          </>
        )}
      </div>

      <LogHeaderActions
        date={detail.date}
        shiftType={detail.shift_type}
        readCount={readCount}
        totalActiveUsers={totalActiveUsers}
        referenceOpen={referenceOpen}
        onToggleReadPanel={onToggleReadPanel}
        onToggleReferencePanel={onToggleReferencePanel}
        onEdit={onEdit}
        onDelete={onDelete}
        onClose={onClose}
      />
    </div>
  );
}
