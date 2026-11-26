import { useState, type KeyboardEvent } from 'react';
import { authApi } from '../../services/api/authApi';
import { useUIStore } from '../../store/uiStore';
import { XIcon } from '../icons';

interface Props {
  onClose: () => void;
}

const inputCls =
  'w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-[13px] text-slate-900 dark:text-slate-100 bg-white dark:bg-[#0f172a] caret-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-300';

export function ChangePasswordPopup({ onClose }: Props) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { addToast } = useUIStore();

  const onEnter = (e: KeyboardEvent) => { if (e.key === 'Enter' && !saving) handleSubmit(); };

  const handleSubmit = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      setError('모든 항목을 입력하세요.');
      return;
    }
    if (newPw !== confirmPw) {
      setError('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (newPw.length < 4) {
      setError('비밀번호는 4자 이상이어야 합니다.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await authApi.changePassword(currentPw, newPw);
      addToast('비밀번호가 변경되었습니다.', 'success');
      onClose();
    } catch (e: unknown) {
      const data = (e as { response?: { data?: { detail?: string; message?: string } } })?.response?.data;
      setError(data?.detail ?? data?.message ?? '비밀번호 변경에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e293b] rounded-xl shadow-xl w-80 p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">비밀번호 변경</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <XIcon size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[12px] text-slate-500 dark:text-slate-400 font-medium block mb-1">현재 비밀번호</label>
            <input
              type="password"
              value={currentPw}
              onChange={e => { setCurrentPw(e.target.value); if (error) setError(null); }}
              onKeyDown={onEnter}
              className={inputCls}
              placeholder="현재 비밀번호 입력"
              autoComplete="current-password"
              disabled={saving}
            />
          </div>
          <div>
            <label className="text-[12px] text-slate-500 dark:text-slate-400 font-medium block mb-1">새 비밀번호</label>
            <input
              type="password"
              value={newPw}
              onChange={e => { setNewPw(e.target.value); if (error) setError(null); }}
              onKeyDown={onEnter}
              className={inputCls}
              placeholder="새 비밀번호 입력 (4자 이상)"
              autoComplete="new-password"
              disabled={saving}
            />
          </div>
          <div>
            <label className="text-[12px] text-slate-500 dark:text-slate-400 font-medium block mb-1">새 비밀번호 확인</label>
            <input
              type="password"
              value={confirmPw}
              onChange={e => { setConfirmPw(e.target.value); if (error) setError(null); }}
              onKeyDown={onEnter}
              className={inputCls}
              placeholder="새 비밀번호 재입력"
              autoComplete="new-password"
              disabled={saving}
            />
          </div>
        </div>

        {error && <p className="mt-2 text-[12px] text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="text-[13px] border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 px-4 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="text-[13px] bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? '변경 중...' : '변경'}
          </button>
        </div>
      </div>
    </div>
  );
}
