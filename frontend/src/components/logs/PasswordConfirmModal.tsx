import { useState } from 'react';
import { authApi } from '../../services/api/authApi';

interface Props {
  authorName: string;
  warningMessage?: string;
  confirmLabel?: string;
  onConfirmed: () => void;
  onCancel: () => void;
}

const inputCls =
  'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900 bg-white caret-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:caret-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-cyan-400';

export function PasswordConfirmModal(props: Props) {
  const {
    authorName,
    warningMessage,
    confirmLabel = '확인 후 저장',
    onConfirmed,
    onCancel,
  } = props;

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!password.trim()) return;
    setLoading(true);
    setError('');
    try {
      await authApi.verifyPassword(password);
      onConfirmed();
    } catch {
      setError('비밀번호가 올바르지 않습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[400px] border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
        <h3 className="text-[16px] font-bold text-slate-800 mb-1 dark:text-slate-100">본인 확인 필요</h3>
        <p className="text-[13px] text-slate-500 mb-5 dark:text-slate-300">
          <span className="font-semibold text-slate-700 dark:text-slate-100">{authorName}</span> 님의 일지를 수정합니다.
          <br />본인의 비밀번호를 입력하면 최종 저장됩니다.
        </p>
        {warningMessage && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
            {warningMessage}
          </div>
        )}
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
          placeholder="내 비밀번호 입력"
          autoFocus
          autoComplete="current-password"
          className={inputCls}
        />
        {error && <p className="text-[13px] text-red-600 mt-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-slate-200 rounded-lg text-[13px] hover:bg-slate-50 transition dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !password.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] hover:bg-blue-700 transition disabled:opacity-50 dark:bg-cyan-600 dark:hover:bg-cyan-500"
          >
            {loading ? '확인 중...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
