// 일지 작성/수정 모달의 오렌지 헤더 바 — LogDetailHeader와 동일 스타일, 날짜·근무유형 인라인 편집
const SHIFT_TYPES = ['주간', '야간', '주야', '공지'];

const SHIFT_BADGE: Record<string, string> = {
  주간: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  야간: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  주야: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  공지: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-300',
};

interface Props {
  date: string;
  shiftType: string;
  teamLabel: string;
  repTitle: string;
  isNew: boolean;
  isSaving: boolean;
  savingText?: string;
  readCount?: number | null;
  inputsDisabled: boolean;
  onDateChange: (v: string) => void;
  onShiftChange: (v: string) => void;
  onToggleReadPanel?: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  onDelete?: () => void;
  onClose: () => void;
  onToggleReferencePanel: () => void;
  onDragStart?: (e: React.MouseEvent) => void;
}

export function LogWriteHeader({
  date, shiftType, teamLabel, repTitle, isNew, isSaving, savingText, readCount,
  inputsDisabled, onDateChange, onShiftChange, onToggleReadPanel, onSaveDraft,
  onSubmit, onDelete, onClose, onToggleReferencePanel, onDragStart,
}: Props) {
  const bg = isNew
    ? 'bg-blue-50 border-blue-200 dark:bg-slate-800 dark:border-slate-700'
    : 'bg-orange-50 border-orange-200 dark:bg-slate-800 dark:border-slate-700';
  const textMuted = isNew ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-400';
  const teamBg = isNew
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
  const btnBase = `px-3 py-1.5 border rounded-lg text-[13px] transition whitespace-nowrap ${
    isNew
      ? 'border-blue-200 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/30'
      : 'border-orange-200 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/20'
  }`;
  const saveBtn = isNew
    ? 'px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[13px] font-bold hover:bg-blue-700 transition disabled:opacity-50 whitespace-nowrap'
    : 'px-4 py-1.5 bg-orange-500 text-white rounded-lg text-[13px] font-bold hover:bg-orange-600 transition disabled:opacity-50 whitespace-nowrap';
  const closeBtn = isNew
    ? 'p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition dark:text-blue-400 dark:hover:text-blue-200 dark:hover:bg-blue-900/30'
    : 'p-2 text-orange-500 hover:text-orange-700 hover:bg-orange-100 rounded-lg transition dark:text-orange-400 dark:hover:text-orange-200 dark:hover:bg-orange-900/20';

  return (
    <div
      onMouseDown={onDragStart}
      className={`px-6 py-1 border-b flex items-center gap-3 shrink-0 select-none ${onDragStart ? 'cursor-grab' : ''} ${bg}`}
    >
      {/* 왼쪽: 날짜·근무유형·팀·제목 */}
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <input
          type="date"
          value={date}
          onChange={e => onDateChange(e.target.value)}
          disabled={inputsDisabled}
          onMouseDown={e => e.stopPropagation()}
          className={`text-[13px] bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-300 rounded cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shrink-0 ${textMuted}`}
        />
        <select
          value={shiftType}
          onChange={e => onShiftChange(e.target.value)}
          disabled={inputsDisabled}
          onMouseDown={e => e.stopPropagation()}
          className={`text-[13px] px-2 py-0.5 rounded font-semibold border-none focus:outline-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shrink-0 ${SHIFT_BADGE[shiftType] ?? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}
        >
          {SHIFT_TYPES.map(s => <option key={s} value={s} style={{ color: '#1e293b', background: '#fff' }}>{s}</option>)}
        </select>
        {teamLabel && (
          <span className={`text-[13px] font-bold px-2 py-0.5 rounded shrink-0 ${teamBg}`}>
            {teamLabel}
          </span>
        )}
        <span className="text-[13px] font-bold text-slate-900 truncate dark:text-slate-100">
          {repTitle || (isNew ? '새 일지 작성' : '일지 수정')}
        </span>
        {!isNew && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/70 text-orange-700 border border-orange-200 shrink-0 dark:bg-slate-700/70 dark:text-orange-300 dark:border-orange-700">
            수정 중
          </span>
        )}
      </div>

      {/* 오른쪽: 액션 버튼 */}
      <div className="flex items-center gap-2 shrink-0" onMouseDown={e => e.stopPropagation()}>
        {!isNew && onToggleReadPanel && (
          <button onClick={onToggleReadPanel} className={btnBase}>
            <span className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              {typeof readCount === 'number' ? `${readCount}명` : '읽음'}
            </span>
          </button>
        )}
        {isNew && (
          <button onClick={onSaveDraft} disabled={isSaving} className={`${btnBase} disabled:opacity-50`}>
            임시저장
          </button>
        )}
        <button onClick={onSubmit} disabled={isSaving} className={saveBtn}>
          {savingText ?? (isSaving ? '처리 중...' : (isNew ? '저장하기' : '전체수정'))}
        </button>
        {!isNew && onDelete && (
          <button onClick={onDelete} className="px-3 py-1.5 border border-red-200 text-red-700 rounded-lg text-[13px] hover:bg-red-100 transition whitespace-nowrap dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20">
            삭제
          </button>
        )}
        <button onClick={onToggleReferencePanel} className="px-3 py-1.5 border border-emerald-200 text-emerald-700 rounded-lg text-[13px] hover:bg-emerald-100 transition whitespace-nowrap dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20">
          참고일지
        </button>
        <button onClick={onClose} className={closeBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
