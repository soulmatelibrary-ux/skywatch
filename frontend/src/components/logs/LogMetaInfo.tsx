import type { LogDetail } from '../../types/log';

const SHIFT_BADGE: Record<string, string> = {
  주간: 'bg-amber-200  text-amber-900  dark:bg-amber-500  dark:text-white',
  야간: 'bg-indigo-200 text-indigo-900 dark:bg-indigo-500 dark:text-white',
  주야: 'bg-violet-200 text-violet-900 dark:bg-violet-500 dark:text-white',
  비번: 'bg-slate-200  text-slate-700  dark:bg-slate-600  dark:text-slate-100',
  공휴: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-500 dark:text-white',
};

interface Props {
  detail: LogDetail;
  onEdit?: () => void;
  isAdmin?: boolean;
}

function fmtDatetime(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd} ${hh}:${mi}`;
}

export function LogMetaInfo({ detail, onEdit, isAdmin = false }: Props) {
  const teamLabel = detail.team === 'day' ? '주간' : detail.team ? `${detail.team}조` : null;
  const isModified = detail.updated_at !== detail.created_at;

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] dark:bg-slate-900 dark:border-slate-700 v2:rounded-md v2:border-[var(--v2-line)] v2:bg-[var(--v2-panel)]">
      {/* 새 화면: 날짜·근무·팀은 위 머리 막대에 이미 있어 숨긴다 */}
      <span className="text-slate-500 shrink-0 dark:text-slate-300 v2:hidden">
        <span className="text-slate-400 mr-1 dark:text-slate-500">날짜</span>
        <span className="font-semibold text-slate-700 dark:text-slate-100">{detail.date}</span>
      </span>

      <span data-shift={detail.shift_type} className={`v2-shift v2:hidden px-2 py-0.5 rounded font-semibold shrink-0 ${SHIFT_BADGE[detail.shift_type] ?? 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-300'}`}>
        {detail.shift_type}
      </span>

      {teamLabel && (
        <span className="font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded shrink-0 dark:bg-slate-800 dark:text-slate-200 v2:hidden">
          {teamLabel}
        </span>
      )}

      <span className="text-slate-500 shrink-0 dark:text-slate-300">
        <span className="text-slate-400 mr-1 dark:text-slate-500">작성자</span>
        <span className="font-semibold text-slate-700 dark:text-slate-100">{detail.author_name ?? '작성자 없음'}</span>
      </span>

      {detail.participants.length > 0 && (
        <span className="hidden v2:inline-flex flex-wrap items-center gap-1.5 text-slate-500 dark:text-slate-300">
          <span className="text-slate-400 dark:text-slate-500">참여</span>
          {detail.participants.map(p => (
            <span
              key={p.user_id}
              className={`rounded px-2 py-0.5 font-medium ${p.role === 'overtime' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}
            >
              {p.name ?? `#${p.user_id}`}
            </span>
          ))}
        </span>
      )}

      <span className="text-slate-400 shrink-0 dark:text-slate-500">
        작성 <span className="text-slate-500 dark:text-slate-300">{fmtDatetime(detail.created_at as unknown as string)}</span>
      </span>

      {isModified && (
        <span className="text-slate-400 shrink-0 dark:text-slate-500">
          수정 <span className="text-slate-500 dark:text-slate-300">{fmtDatetime(detail.updated_at as unknown as string)}</span>
        </span>
      )}
      {isAdmin && onEdit && (
        <button
          onClick={onEdit}
          className="ml-auto shrink-0 text-[12px] px-2.5 py-1 border border-slate-300 rounded-lg text-slate-500 hover:bg-slate-200 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700 transition"
        >
          수정
        </button>
      )}
    </div>
  );
}
