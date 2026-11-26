// 백업 실행 및 파일 목록 관리.

import { useState, useEffect } from 'react';
import { useBackupManager } from '../../hooks/useBackupManager';
import { useBackupInfo } from '../../hooks/useBackupInfo';
import { backupApi } from '../../services/api/backupApi';
import { BackupRestorePanel } from './BackupRestorePanel';

interface BackupActionsProps { manager: ReturnType<typeof useBackupManager>; }

export function BackupActions({ manager }: BackupActionsProps) {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isRestoringMultiple, setIsRestoringMultiple] = useState(false);
  const { info: backupInfo, error: backupInfoError } = useBackupInfo();

  useEffect(() => {
    if (!manager.creating && !manager.restoring && !isRestoringMultiple) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [manager.creating, manager.restoring, isRestoringMultiple]);

  const handleCreate = async (target: 'skywatch' | 'skynet') => { if (!confirm(`${target === 'skywatch' ? 'SkyWatch' : 'SkyNet'} 백업을 실행하시겠습니까?`)) return; await manager.create(target); };
  const handleDownload = (filename: string) => { backupApi.download(filename); };
  const handleRestore = async (filename: string) => {
    if (!confirm(`"${filename}"에서 복구하시겠습니까?\n\n⚠️ 경고: 현재 DB의 모든 데이터가 백업 시점의 데이터로 완전히 덮어씌워집니다.`)) return;
    await manager.restore(filename);
  };
  const handleDelete = async (filename: string) => { if (!confirm(`"${filename}"을(를) 삭제하시겠습니까?`)) return; await manager.remove(filename); };
  const toggleFileSelection = (filename: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(filename)) newSelected.delete(filename); else newSelected.add(filename);
    setSelectedFiles(newSelected);
  };
  const handleRestoreSelected = async () => {
    const files = Array.from(selectedFiles);
    if (!confirm(`선택된 ${files.length}개 파일에서 차례대로 복구하시겠습니까?\n\n⚠️ 경고: 각 복구마다 현재 DB의 모든 데이터가 덮어씌워집니다.\n먼저 최신 백업을 실행하시는 것을 권장합니다.`)) return;
    setIsRestoringMultiple(true);
    try { for (const filename of files) await manager.restore(filename); setSelectedFiles(new Set()); }
    finally { setIsRestoringMultiple(false); }
  };
  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.checked ? new Set(manager.items.map(item => item.filename)) : new Set());
  };
  const isAllSelected = selectedFiles.size === manager.items.length && manager.items.length > 0;

  return (
    <div>
      <h2 className="text-[16px] font-semibold text-slate-800 dark:text-slate-100 mb-1">DB 백업</h2>
      <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-6">매일 오전 3시 자동으로 실행됩니다.</p>

      {backupInfoError ? (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg text-[13px] text-yellow-700 dark:text-yellow-400">백업 정보를 불러올 수 없습니다</div>
      ) : backupInfo ? (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <p className="text-[13px] text-slate-700 dark:text-slate-200">{backupInfo.description}</p>
        </div>
      ) : null}

      <div className="mb-6 flex gap-3">
        <button onClick={() => handleCreate('skywatch')} disabled={!!manager.creating}
          className="px-4 py-2 bg-blue-600 text-white text-[13px] rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
          {manager.creating === 'skywatch' ? 'SkyWatch 백업 중...' : 'SkyWatch 백업'}
        </button>
        <button onClick={() => handleCreate('skynet')} disabled={!!manager.creating}
          className="px-4 py-2 bg-purple-600 text-white text-[13px] rounded-lg hover:bg-purple-700 disabled:opacity-50 transition">
          {manager.creating === 'skynet' ? 'SkyNet 백업 중...' : 'SkyNet 백업'}
        </button>
      </div>

      {manager.error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-[13px] text-red-700 dark:text-red-400">{manager.error}</div>
      )}

      <BackupRestorePanel selectedCount={selectedFiles.size} isRestoring={isRestoringMultiple} onRestoreSelected={handleRestoreSelected} onClearSelection={() => setSelectedFiles(new Set())} />

      {manager.loading ? (
        <div className="text-center text-[13px] text-slate-500 dark:text-slate-400 py-8">로드 중...</div>
      ) : manager.items.length === 0 ? (
        <div className="text-center text-[13px] text-slate-500 dark:text-slate-400 py-8">백업이 없습니다</div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-[#1e293b]">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f172a]">
                <th className="w-8 px-4 py-3 text-center"><input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} className="cursor-pointer" /></th>
                <th className="text-left px-4 py-3 font-medium text-slate-700 dark:text-slate-200">파일명</th>
                <th className="text-right px-4 py-3 font-medium text-slate-700 dark:text-slate-200">크기</th>
                <th className="text-left px-4 py-3 font-medium text-slate-700 dark:text-slate-200">생성일</th>
                <th className="whitespace-nowrap text-right px-4 py-3 font-medium text-slate-700 dark:text-slate-200 w-[160px]">작업</th>
              </tr>
            </thead>
            <tbody>
              {manager.items.map((backup) => {
                const isRestoring = manager.restoring === backup.filename;
                const isSelected = selectedFiles.has(backup.filename);
                return (
                  <tr key={backup.filename} className={`border-b border-slate-100 dark:border-slate-700 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'}`}>
                    <td className="w-8 px-4 py-3 text-center">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleFileSelection(backup.filename)} disabled={!!manager.creating || isRestoring} className="cursor-pointer disabled:opacity-50" />
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200 font-mono text-[12px]">{backup.filename}</td>
                    <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">{backup.size_mb} MB</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{new Date(backup.created_at).toLocaleString('ko-KR')}</td>
                    <td className="px-4 py-3 w-[160px]">
                      <div className="flex justify-end gap-2 whitespace-nowrap">
                        <button onClick={() => handleDownload(backup.filename)}
                          className="px-3 py-1 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 rounded hover:bg-sky-200 dark:hover:bg-sky-900/50 text-[12px] font-medium transition">내보내기</button>
                        <button onClick={() => handleRestore(backup.filename)} disabled={isRestoring}
                          className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded hover:bg-emerald-200 dark:hover:bg-emerald-900/50 disabled:opacity-50 transition text-[12px] font-medium">
                          {isRestoring ? '복구 중...' : '복구'}
                        </button>
                        <button onClick={() => handleDelete(backup.filename)} disabled={!!manager.creating || isRestoring || isRestoringMultiple}
                          className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 transition text-[12px] font-medium">
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
