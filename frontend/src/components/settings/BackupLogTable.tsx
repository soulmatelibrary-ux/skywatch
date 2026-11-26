// 백업 실행 이력 테이블.

import type { BackupLogItem } from '../../services/api/backupApi';

interface BackupLogTableProps {
  logs: BackupLogItem[]; loading: boolean; error: string | null;
  deleting: number | null; onDelete: (logId: number) => void; onRestore: (logId: number) => void;
}

export function BackupLogTable({ logs, loading, error, deleting, onDelete, onRestore }: BackupLogTableProps) {
  const handleDelete = (logId: number) => { if (!confirm('이 이력을 삭제하시겠습니까?')) return; onDelete(logId); };
  const handleRestore = (logId: number) => { if (!confirm('이 이력을 복구하시겠습니까?')) return; onRestore(logId); };

  return (
    <div>
      <h3 className="text-[16px] font-semibold text-slate-800 dark:text-slate-100 mb-1">백업 이력</h3>
      <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-6">최근 백업 실행 기록입니다. 삭제된 이력은 복구할 수 있습니다.</p>

      {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-[13px] text-red-700 dark:text-red-400">{error}</div>}

      {loading ? (
        <div className="text-center text-[13px] text-slate-500 dark:text-slate-400 py-8">로드 중...</div>
      ) : logs.length === 0 ? (
        <div className="text-center text-[13px] text-slate-500 dark:text-slate-400 py-8">이력이 없습니다</div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-[#1e293b]">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a]">
                <th className="text-left px-4 py-2 font-medium text-slate-700 dark:text-slate-200">일시</th>
                <th className="text-left px-4 py-2 font-medium text-slate-700 dark:text-slate-200">구분</th>
                <th className="text-left px-4 py-2 font-medium text-slate-700 dark:text-slate-200">결과</th>
                <th className="text-left px-4 py-2 font-medium text-slate-700 dark:text-slate-200">파일/메시지</th>
                <th className="text-left px-4 py-2 font-medium text-slate-700 dark:text-slate-200">실행자</th>
                <th className="text-right px-4 py-2 font-medium text-slate-700 dark:text-slate-200">작업</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className={`border-b border-slate-100 dark:border-slate-700 ${log.is_deleted ? 'bg-slate-100 dark:bg-slate-700/50 opacity-60' : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'}`}>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300 text-[12px]">{new Date(log.created_at).toLocaleString('ko-KR')}</td>
                  <td className="px-4 py-2 text-slate-700 dark:text-slate-200">{log.action === 'backup' ? '백업' : '복구'}</td>
                  <td className="px-4 py-2 flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[12px] font-medium ${log.status === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                      {log.status === 'success' ? '성공' : '실패'}
                    </span>
                    {log.is_deleted && <span className="px-2 py-0.5 rounded text-[12px] font-medium bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300">삭제됨</span>}
                  </td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300 font-mono text-[12px] truncate">{log.filename || log.error_message || '-'}</td>
                  <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{log.performed_by ?? <span className="text-slate-400 dark:text-slate-500">자동 백업</span>}</td>
                  <td className="px-4 py-2 text-right">
                    {log.is_deleted ? (
                      <button onClick={() => handleRestore(log.id)} disabled={deleting === log.id}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 transition text-[12px] font-medium">
                        {deleting === log.id ? '복구 중...' : '복구'}
                      </button>
                    ) : (
                      <button onClick={() => handleDelete(log.id)} disabled={deleting === log.id}
                        className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 transition text-[12px] font-medium">
                        {deleting === log.id ? '삭제 중...' : '삭제'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
