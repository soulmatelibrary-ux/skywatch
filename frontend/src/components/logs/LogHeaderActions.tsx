// 일지 보기 창 머리 막대의 오른쪽 버튼 묶음 — 버튼·이름·권한은 그대로, 새 화면(v2)에서만 색 체계·삭제 분리를 입힌다
import { openShiftRead } from '../../hooks/useLogChannel';
import { V2_OUTLINE } from '../common/v2Styles';

interface Props {
  date: string;
  shiftType: string;
  readCount: number;
  totalActiveUsers?: number;
  referenceOpen: boolean;
  onToggleReadPanel: () => void;
  onToggleReferencePanel?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose: () => void;
}

const FOCUS = 'v2:focus-visible:ring-2 v2:focus-visible:ring-[var(--v2-accent)] v2:focus-visible:outline-none';
const OUTLINE = `${V2_OUTLINE} v2:text-[var(--v2-text)] ${FOCUS}`;
const REF_OPEN = `v2:rounded-md v2:border-[var(--v2-accent)] v2:bg-[var(--v2-accent-soft)] v2:text-[var(--v2-accent)] v2:hover:bg-[var(--v2-accent-soft)] ${FOCUS}`;
// 삭제: 윤곽 없는 빨강 글자, 버튼 묶음 맨 앞(닫기 반대편)으로 보내고 구분선으로 떼어 놓는다 (DOM 순서는 그대로)
const DANGER = `v2:order-first v2:border-transparent v2:bg-transparent v2:text-red-600 v2:hover:bg-red-50 v2:dark:text-red-300 v2:dark:hover:bg-red-500/20 ${FOCUS}`;

export function LogHeaderActions({
  date, shiftType, readCount, totalActiveUsers, referenceOpen,
  onToggleReadPanel, onToggleReferencePanel, onEdit, onDelete, onClose,
}: Props) {
  const readLabel = totalActiveUsers ? `${readCount}/${totalActiveUsers}명` : `${readCount}명`;
  const readTitle = `읽은 사람 ${readLabel} — 눌러서 누가 읽었는지 보기`;

  return (
    <div className="flex items-center gap-2 shrink-0" onMouseDown={e => e.stopPropagation()}>
      <button
        onClick={onToggleReadPanel}
        title={readTitle}
        aria-label={readTitle}
        className={`px-3 py-1.5 border border-orange-200 dark:border-orange-400/40 text-orange-700 dark:text-orange-300 rounded-lg text-[13px] hover:bg-orange-100 dark:hover:bg-orange-500/20 transition flex items-center gap-1.5 ${OUTLINE}`}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span>{readLabel}</span>
      </button>

      {onEdit && (
        <button
          onClick={onEdit}
          className={`px-3 py-1.5 border border-orange-300 dark:border-orange-400/40 text-orange-700 dark:text-orange-300 rounded-lg text-[13px] hover:bg-orange-100 dark:hover:bg-orange-500/20 transition font-medium ${OUTLINE}`}
        >
          전체수정
        </button>
      )}
      {onDelete && (
        <>
          <span aria-hidden="true" className="hidden v2:block v2:order-[-1] v2:mx-[4px] v2:h-[20px] v2:w-px v2:bg-[var(--v2-line)]" />
          <button
            onClick={onDelete}
            className={`px-3 py-1.5 border border-red-200 dark:border-red-400/40 text-red-700 dark:text-red-300 rounded-lg text-[13px] hover:bg-red-100 dark:hover:bg-red-500/20 transition ${DANGER}`}
          >
            삭제
          </button>
        </>
      )}

      {['주간', '야간', '주야'].includes(shiftType) && (
        <button
          onClick={() => openShiftRead(date, shiftType)}
          title="같은 근무를 신규 근무일지 보기 화면으로 엽니다"
          className={`px-3 py-1.5 border border-sky-200 dark:border-sky-400/40 text-sky-700 dark:text-sky-300 rounded-lg text-[13px] hover:bg-sky-100 dark:hover:bg-sky-500/20 transition ${OUTLINE}`}
        >
          신규 화면
        </button>
      )}

      {onToggleReferencePanel && (
        <button
          onClick={onToggleReferencePanel}
          aria-pressed={referenceOpen}
          className={`px-3 py-1.5 border border-emerald-200 dark:border-emerald-400/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-[13px] hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition ${referenceOpen ? REF_OPEN : OUTLINE}`}
        >
          참고일지
        </button>
      )}

      <button
        onClick={onClose}
        aria-label="일지 닫기"
        title="닫기 (Esc)"
        className={`p-2 text-orange-500 dark:text-orange-300 hover:text-orange-700 dark:hover:text-orange-100 hover:bg-orange-100 dark:hover:bg-slate-700 rounded-lg transition v2:rounded-md v2:text-[var(--v2-muted)] v2:hover:bg-[var(--v2-hover)] v2:hover:text-[var(--v2-text)] ${FOCUS}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
