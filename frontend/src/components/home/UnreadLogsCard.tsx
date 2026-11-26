import type { Log } from '../../types/log';

interface Props {
  logs: Log[];
  onOpenLog: (logId: number) => void;
}

export function UnreadLogsCard({ logs, onOpenLog }: Props) {
  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-xl border border-slate-200 dark:border-slate-700 p-3">
      <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
        <EyeIcon />
        읽지 않은 일지
        <span className="ml-auto text-[11px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
          {logs.length}건
        </span>
      </h3>
      <div className="space-y-0.5 max-h-[150px] overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-center py-2 text-slate-300 text-[11px]">일지 없음</div>
        ) : logs.map(log => (
          <div
            key={log.id}
            onClick={() => onOpenLog(log.id)}
            className="px-2 py-0.5 rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer transition"
          >
            <div className="flex items-center gap-1">
              <div className="text-[11px] font-medium text-slate-800 dark:text-slate-100 flex-1 truncate leading-none">
                {log.title ?? `${log.date} ${log.shift_type}`}
              </div>
              <div className="shrink-0 flex items-center gap-1">
                {log.open_count > 0 && (
                  <span className="text-[9px] px-1 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                    열람 {log.open_count}
                  </span>
                )}
                {log.in_progress_count > 0 && (
                  <span className="text-[9px] px-1 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium whitespace-nowrap">
                    진행 {log.in_progress_count}
                  </span>
                )}
                <div className="text-[9px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                  {log.date} {log.shift_type}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
