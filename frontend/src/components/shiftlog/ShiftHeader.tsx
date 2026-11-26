import type { UserSimple } from '../../services/api/usersApi';
import type { ShiftHistoryItem, ShiftType, ShiftView } from '../../types/shiftLog';
import type { ShiftWorker } from '../../types/schedule';
import { addDays, dayLabel, kstToday } from '../../utils/shiftText';
import { ShiftChip } from './ShiftBadges';
import { V2_INPUT, V2_NOTICE, V2_OUTLINE, V2_PANEL, V2_SEG_OFF, V2_SEG_ON } from '../common/v2Styles';

interface Props {
  date: string;
  shift: ShiftType;
  view: ShiftView | null;
  /** 내가 일한 최근 7일 근무 (이동 목록) */
  recent: ShiftHistoryItem[];
  loading: boolean;
  roster: ShiftWorker[];
  users: UserSimple[];
  meId: number;
  busy: boolean;
  onChange: (date: string, shift: ShiftType) => void;
  onStep: (dir: 1 | -1) => void;
  onSaveWorkers: (userIds: number[]) => void;
}

const ROLE_LABEL: Record<string, string> = { sub: '대체', overtime: '추가 근무' };

export function ShiftHeader({ date, shift, view, recent, loading, roster, users, meId, busy, onChange, onStep, onSaveWorkers }: Props) {
  const today = kstToday();
  const mine = roster.filter(r => r.user_id === meId && (r.shift === '주간' || r.shift === '야간'));
  const workers = view?.workers ?? [];
  const isProxy = workers.length > 0 && !workers.some(w => w.user_id === meId);
  const ids = workers.map(w => w.user_id);
  const old = date < addDays(today, -7);   // 7일보다 이전 근무: 막지 않고 안내만
  const rank: Record<string, number> = { 주간: 0, 주야: 1, 야간: 2 };
  const recentSorted = [...recent].sort((a, b) => b.date.localeCompare(a.date) || (rank[b.shift_type] ?? 0) - (rank[a.shift_type] ?? 0));
  const quickBtn = (s: ShiftType, label: string) => (
    <button key={s} type="button" onClick={() => onChange(today, s)}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-bold v2:rounded-md ${date === today && shift === s
        ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 v2:border-[var(--v2-accent)] v2:bg-[var(--v2-accent-soft)] v2:text-[var(--v2-accent)]'
        : `border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 ${V2_OUTLINE}`}`}>
      <ShiftChip shift={s} />{label}
    </button>
  );

  return (
    <div className="mb-2 space-y-1">
      <div className={`flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 dark:border-slate-700 dark:bg-[#1e293b] ${V2_PANEL}`}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2 flex flex-wrap items-baseline gap-x-2">
            <h1 className="text-[16px] font-extrabold text-slate-900 dark:text-slate-100">근무일지 작성</h1>
            <p className="text-[11px] text-slate-400">날짜와 근무조를 확인한 뒤 작성하세요.</p>
          </div>
          <span className="flex-1" />
          <span className="text-[12px] font-bold text-slate-500">작성 대상</span>
          <button type="button" onClick={() => onStep(-1)} title="이전 근무" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-100" aria-label="이전 근무">◀</button>
          <input type="date" value={date} max={today} onChange={e => e.target.value && onChange(e.target.value, shift)}
            aria-label="작성 날짜" className={`h-8 rounded-lg border border-slate-200 bg-white px-2 text-[13px] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 ${V2_INPUT}`} />
          <div role="group" aria-label="근무조 선택" className="inline-flex h-8 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600 v2:rounded-md v2:border-[var(--v2-line)]">
            {(['주간', '야간', '주야'] as ShiftType[]).map(s => (
              <button key={s} type="button" onClick={() => onChange(date, s)} aria-pressed={shift === s}
                className={`min-w-12 px-3 text-[12px] font-bold ${shift === s ? `bg-blue-600 text-white ${V2_SEG_ON}` : `bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-300 ${V2_SEG_OFF}`}`}>{s}</button>
            ))}
          </div>
          <button type="button" onClick={() => onStep(1)} disabled={date >= today && shift !== '주간'} title="다음 근무" className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-slate-100" aria-label="다음 근무">▶</button>
          <select value={recentSorted.some(r => r.date === date && r.shift_type === shift) ? `${date}|${shift}` : ''} aria-label="최근 7일 근무로 이동"
            onChange={e => { const [d, s] = e.target.value.split('|'); if (d) onChange(d, s as ShiftType); }}
            className={`h-8 max-w-[210px] rounded-lg border border-slate-200 bg-white px-2 text-[12px] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 ${V2_INPUT}`}>
            <option value="">최근 7일 근무 ▾</option>
            {recentSorted.map(r => <option key={`${r.date}|${r.shift_type}`} value={`${r.date}|${r.shift_type}`}>{dayLabel(r.date)} {r.shift_type} · {r.card_count > 0 ? `카드 ${r.card_count}장` : '카드 없음'}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-100 pt-1.5 dark:border-slate-700/70">
          <span className="text-[12px] font-bold text-slate-500">오늘 내 근무</span>
          {mine.length === 0 && <span className="text-[12px] text-slate-400">근무표에 없음</span>}
          {mine.map(r => quickBtn(r.shift as ShiftType, `${r.code}조`))}
          {mine.length > 1 && quickBtn('주야', '하나로 쓰기')}
          <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" aria-hidden />
          <span className="text-[12px] font-bold text-slate-500">근무자</span>
          {view?.team && <span className="text-[12px] text-slate-400">{view.team}조</span>}
          {loading && <span className="text-[12px] text-slate-400">근무 정보를 불러오는 중...</span>}
          {workers.map(w => (
            <span key={w.user_id} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-0 pl-2.5 pr-1 text-[13px] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
              {w.name}{ROLE_LABEL[w.role] && <span className="text-[11px] font-bold text-amber-600">{ROLE_LABEL[w.role]}</span>}
              <button type="button" disabled={busy || loading || workers.length < 2} title="근무자에서 빼기" aria-label={`${w.name} 근무자에서 빼기`} onClick={() => onSaveWorkers(ids.filter(id => id !== w.user_id))}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 dark:hover:bg-red-950/40">×</button>
            </span>
          ))}
          {!loading && workers.length === 0 && <span className="text-[12px] text-slate-400">근무표에 없는 근무입니다. 근무자를 추가하세요.</span>}
          <select value="" disabled={busy || loading} aria-label="근무자 추가" onChange={e => e.target.value && onSaveWorkers([...ids, Number(e.target.value)])}
            className={`rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[12px] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 ${V2_INPUT}`}>
            <option value="">＋ 근무자 추가</option>
            {users.filter(u => !ids.includes(u.id)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <span className="flex-1" />
          {isProxy && <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">대리 작성</span>}
        </div>
      </div>
      {(view?.is_past || isProxy) && (
        <div className={`rounded-lg bg-amber-50 px-3 py-1 text-[12px] leading-5 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 ${V2_NOTICE} v2:border-amber-500`}>
          {view?.is_past && <div>⏱ <b>지난 근무를 작성 중입니다.</b> {dayLabel(date)} {shift}. 지금 쓰는 카드에는 "지연 작성"과 실제 작성 시각이 남습니다. 이미 쓴 카드는 ‘이 근무의 카드’에서 고칠 수 있습니다.</div>}
          {view?.is_past && old && <div>⏳ <b>오래된 근무입니다.</b> {dayLabel(date)} {shift} 는 7일보다 이전 기록입니다. 고치거나 삭제할 수 있지만, 이미 읽은 사람과 내용이 달라질 수 있습니다.</div>}
          {isProxy && <div>👤 <b>이 근무의 근무자가 아닙니다.</b> 카드는 "대리 작성"으로 표시됩니다.</div>}
        </div>
      )}
      {view?.conflict && (
        <div className={`rounded-lg bg-red-50 px-3 py-1 text-[12px] text-red-700 dark:bg-red-900/30 dark:text-red-200 ${V2_NOTICE} v2:border-red-500`}>⚠ {view.conflict}</div>
      )}
      {shift === '주야' && !view?.conflict && (
        <div className={`rounded-lg bg-blue-50 px-3 py-1 text-[12px] text-blue-700 dark:bg-blue-900/30 dark:text-blue-200 ${V2_NOTICE} v2:border-[var(--v2-accent)]`}>
          🌗 <b>주야 일지</b>는 주간과 야간 카드를 한 일지에 모읍니다. 같은 날 주간·야간 일지와 함께 쓸 수 없습니다.
        </div>
      )}
    </div>
  );
}
