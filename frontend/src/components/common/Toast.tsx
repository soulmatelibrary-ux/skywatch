import { useUIStore } from '../../store/uiStore';
import { XIcon, CheckCircleIcon, AlertIcon } from '../icons';

const TYPE_STYLES = {
  success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/50 dark:border-green-800 dark:text-green-300',
  error:   'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/50 dark:border-red-800 dark:text-red-300',
  warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/50 dark:border-amber-700 dark:text-amber-300',
  info:    'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300',
};

const TYPE_ICON = {
  success: <CheckCircleIcon size={16} />,
  error:   <AlertIcon size={16} />,
  warning: <AlertIcon size={16} />,
  info:    null,
};

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={[
            'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-[14px] font-medium pointer-events-auto min-w-[260px] max-w-sm',
            TYPE_STYLES[t.type],
          ].join(' ')}
        >
          {TYPE_ICON[t.type] && (
            <span className="shrink-0">{TYPE_ICON[t.type]}</span>
          )}
          <span className="flex-1">{t.message}</span>
          {t.count > 1 && (
            <span className="shrink-0 text-[11px] font-bold opacity-70">×{t.count}</span>
          )}
          <button onClick={() => removeToast(t.id)} className="shrink-0 opacity-60 hover:opacity-100 transition">
            <XIcon size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
