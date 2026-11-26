// DB 백업 및 복구 관리 UI.

import { useEffect } from 'react';
import { useBackupManager } from '../../hooks/useBackupManager';
import { useBackupLogs } from '../../hooks/useBackupLogs';
import { BackupActions } from './BackupActions';
import { BackupLogTable } from './BackupLogTable';

interface BackupManagerProps {
  manager: ReturnType<typeof useBackupManager>;
}

export function BackupManager({ manager }: BackupManagerProps) {
  const logsHook = useBackupLogs();
  const { load } = logsHook;

  // 백업/복구 완료 후 이력 갱신
  useEffect(() => {
    if (!manager.creating && !manager.restoring) {
      load();
    }
  }, [manager.creating, manager.restoring, load]);

  return (
    <div className="space-y-8">
      <BackupActions manager={manager} />
      <BackupLogTable
        logs={logsHook.logs}
        loading={logsHook.loading}
        error={logsHook.error}
        deleting={logsHook.deleting}
        onDelete={logsHook.deleteLog}
        onRestore={logsHook.restoreLog}
      />
    </div>
  );
}
