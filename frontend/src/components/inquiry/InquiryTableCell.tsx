// 문의사항 테이블 셀별 렌더러 (더블클릭 편집)
import type { Inquiry } from '../../types/inquiry';
import type { UserSimple } from '../../services/api/usersApi';

interface Props {
  field: keyof Inquiry;
  inquiry: Inquiry;
  isEditing: boolean;
  editValue: string;
  onStartEdit: (field: keyof Inquiry) => void;
  onEditValueChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  users?: UserSimple[];
  /** td 추가 클래스 (좁은 화면에서 열 숨김 등) */
  className?: string;
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'green',
  in_progress: 'blue',
  pr_registered: 'purple',
  pr_duplicate: 'orange',
  tracking: 'yellow',
};

const STATUS_LABELS: Record<string, string> = {
  completed: '완료',
  in_progress: '진행중',
  pr_registered: 'PR등록',
  pr_duplicate: 'PR중복',
  tracking: '추적관찰',
};

const editCls = 'w-full px-2 py-0.5 text-[12px] border border-blue-400 rounded bg-white dark:bg-slate-950 disabled:opacity-50';

export function InquiryTableCell({
  field,
  inquiry,
  isEditing,
  editValue,
  onStartEdit,
  onEditValueChange,
  onSave,
  onCancel,
  isSaving = false,
  users = [],
  className = '',
}: Props) {
  const value = inquiry[field];
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSave();
    if (e.key === 'Escape') onCancel();
  };

  if (isEditing) {
    let editor;
    if (field === 'status') {
      editor = (
        <select value={editValue} onChange={e => onEditValueChange(e.target.value)}
          onBlur={onSave} onKeyDown={onKeyDown} autoFocus disabled={isSaving} className={editCls}>
          {Object.entries(STATUS_LABELS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      );
    } else if (field === 'received_by_name') {
      // 접수자는 사용자 ID(received_by)로 저장
      editor = (
        <select value={editValue} onChange={e => onEditValueChange(e.target.value)}
          onBlur={onSave} onKeyDown={onKeyDown} autoFocus disabled={isSaving} className={editCls}>
          <option value="">(없음)</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      );
    } else {
      const isDate = field === 'occurred_date' || field === 'completed_date';
      editor = (
        <input type={isDate ? 'date' : 'text'} value={editValue}
          onChange={e => onEditValueChange(e.target.value)}
          onBlur={onSave} onKeyDown={onKeyDown} autoFocus disabled={isSaving} className={editCls} />
      );
    }
    return <td className={`px-1 py-1.5 ${className}`}>{editor}</td>;
  }

  const content = (() => {
    if (field === 'status') {
      const statusLabel = STATUS_LABELS[String(value)] || String(value);
      const color = STATUS_COLORS[String(value)] || 'gray';
      const colorMap: Record<string, string> = {
        green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
        blue: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200',
        purple: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200',
        orange: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-200',
        yellow: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
        gray: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-200',
      };
      return (
        <span className={`inline-block whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${colorMap[color] || colorMap.gray}`}>
          {statusLabel}
        </span>
      );
    }
    if (field === 'occurred_date' || field === 'completed_date') {
      return value ? String(value).substring(0, 10) : '-';
    }
    if (field === 'received_by_name') {
      // 이관 데이터는 사용자 매칭 없이 원본 이름만 존재
      return inquiry.received_by_name || inquiry.received_by_raw || '-';
    }
    return value ? String(value) : '-';
  })();

  const empty = content === '-';
  return (
    <td
      onDoubleClick={() => onStartEdit(field)}
      title={typeof content === 'string' && !empty ? `${content} (두 번 눌러 고치기)` : '두 번 눌러 고치기'}
      className={`${className} cursor-text truncate px-2 py-2.5 text-[12px] transition hover:bg-slate-100/70 dark:hover:bg-slate-800 ${empty ? 'text-slate-300 dark:text-slate-600' : 'text-slate-700 dark:text-slate-300'} ${field === 'occurred_date' || field === 'completed_date' || field === 'occurred_time' ? 'tabular-nums' : ''}`}
    >
      {content}
    </td>
  );
}
