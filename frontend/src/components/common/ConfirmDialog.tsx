import { useEffect } from 'react';

interface Props {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title = '확인', message,
  confirmLabel = '확인', cancelLabel = '취소',
  danger = false, onConfirm, onCancel,
}: Props) {
  /* ESC 키 닫기 */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-6 w-full max-w-sm">
        <h3 className="text-[17px] font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-[15px] text-slate-600 leading-relaxed">{message}</p>
        <div className="flex gap-3 mt-5 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-[14px] font-medium hover:bg-slate-50 transition"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={[
              'px-4 py-2 rounded-lg text-white text-[14px] font-semibold transition',
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1e40af] hover:bg-[#1e3a8a]',
            ].join(' ')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
