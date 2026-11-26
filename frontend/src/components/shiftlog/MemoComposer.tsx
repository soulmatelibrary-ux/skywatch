import { useState } from 'react';
import type { UserSimple } from '../../services/api/usersApi';
import type { CardCategory } from '../../types/log';
import type { MemoInfo, MemoInput, ShiftCard } from '../../types/shiftLog';
import { useUIStore } from '../../store/uiStore';
import { AttachmentPicker } from './AttachmentViews';
import { MemoRow } from './MemoRow';
import { V2_INPUT, V2_PRIMARY, V2_SEG_OFF, V2_SEG_ON } from '../common/v2Styles';

interface Props {
  categories: CardCategory[];
  users: UserSimple[];
  meId: number;
  memos: ShiftCard[];
  busy: boolean;
  disabled: boolean;
  onSubmit: (body: Omit<MemoInput, 'date' | 'shift_type'>, files: File[]) => Promise<boolean>;
}

const TYPES = ['전달사항', '행정/문서 관리', '기타'];
const TYPE_LABEL: Record<string, string> = { '전달사항': '전달사항', '행정/문서 관리': '행정', '기타': '기타' };
const INPUT = `rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 ${V2_INPUT}`;

/** 카드로 쓸 필요가 없는 전달·행정·기타를 한 줄로 남긴다. */
export function MemoComposer({ categories, users, meId, memos, busy, disabled, onSubmit }: Props) {
  const [type, setType] = useState(TYPES[0]);
  const [text, setText] = useState('');
  const [target, setTarget] = useState('next');
  const [keep, setKeep] = useState<MemoInfo['keep']>('checked');
  const [files, setFiles] = useState<File[]>([]);
  const addToast = useUIStore(s => s.addToast);
  const typeCats = TYPES.map(name => categories.find(c => c.name === name)).filter(Boolean) as CardCategory[];

  async function submit() {
    if (!text.trim() || busy || disabled) return;
    const isUser = /^\d+$/.test(target);
    const ok = await onSubmit({
      text: text.trim(), category_id: categories.find(c => c.name === type)?.id ?? null,
      target_type: isUser ? 'user' : (target as 'next' | 'all'), target_user_id: isUser ? Number(target) : null, keep,
    }, files);
    if (ok) { setText(''); setFiles([]); }
  }

  return (
    <div className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap gap-2">
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600 v2:rounded-md v2:border-[var(--v2-line)]">
          {typeCats.map(c => (
            <button key={c.id} type="button" onClick={() => setType(c.name)}
              className={`px-3 py-1 text-[12px] font-bold ${type === c.name ? `bg-blue-600 text-white ${V2_SEG_ON}` : `bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-300 ${V2_SEG_OFF}`}`}>{TYPE_LABEL[c.name]}</button>
          ))}
        </div>
        <input value={text} onChange={e => setText(e.target.value)} maxLength={255} aria-label="전달 또는 메모 내용"
          onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit(); }}
          placeholder="예) 2번 콘솔 마우스 교체 요청함. 내일 오전 시설팀 방문 예정" className={`${INPUT} min-w-[220px] flex-1`} />
      </div>
      <AttachmentPicker files={files} onChange={setFiles} onReject={m => addToast(m, 'warning')} />
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
        <label htmlFor="shift-memo-target" className="font-semibold">받는 사람</label>
        <select id="shift-memo-target" value={target} onChange={e => setTarget(e.target.value)} className={INPUT}>
          <option value="next">다음 근무</option>
          <option value="all">근무자 전원</option>
          {users.filter(u => u.id !== meId).map(u => <option key={u.id} value={String(u.id)}>{u.name}</option>)}
        </select>
        <label htmlFor="shift-memo-keep" className="font-semibold">유지</label>
        <select id="shift-memo-keep" value={keep} onChange={e => setKeep(e.target.value as MemoInfo['keep'])} className={INPUT}>
          <option value="checked">확인할 때까지</option>
          <option value="shift">다음 근무에만</option>
          <option value="days">7일간</option>
        </select>
        <span className="flex-1" />
        <button type="button" onClick={submit} disabled={busy || disabled || !text.trim()}
          className={`min-h-9 rounded-lg bg-blue-600 px-4 py-1.5 text-[13px] font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 ${V2_PRIMARY}`}>메모 저장</button>
      </div>
      {memos.length > 0 && (
        <div>
          <div className="mt-1 text-[12px] font-bold text-slate-400">이 근무에 남긴 전달 {memos.length}건</div>
          {memos.map(m => <MemoRow key={m.id} card={m} totalUsers={users.length} />)}
        </div>
      )}
    </div>
  );
}
