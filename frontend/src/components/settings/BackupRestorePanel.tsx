// 백업 파일 다중 복구 패널.

interface BackupRestorePanelProps {
  selectedCount: number;
  isRestoring: boolean;
  onRestoreSelected: () => void;
  onClearSelection: () => void;
}

export function BackupRestorePanel({
  selectedCount,
  isRestoring,
  onRestoreSelected,
  onClearSelection,
}: BackupRestorePanelProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between gap-4">
        <div className="text-[13px] text-blue-700">
          <span className="font-semibold">{selectedCount}개</span>의 백업 파일이 선택되었습니다.
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRestoreSelected}
            disabled={isRestoring}
            className="px-4 py-2 bg-blue-600 text-white text-[13px] rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
          >
            {isRestoring ? '복구 중...' : '선택된 항목 복구'}
          </button>
          <button
            onClick={onClearSelection}
            disabled={isRestoring}
            className="px-4 py-2 bg-slate-200 text-slate-700 text-[13px] rounded-lg hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
          >
            선택 해제
          </button>
        </div>
      </div>
    </div>
  );
}
