import { useEffect, useState } from 'react';
import { useAuthInit } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { LogDetailModal } from '../components/logs/LogDetailModal';
import { LogWriteModal } from '../components/logs/LogWriteModal';
import { usePopupGeometrySave } from '../hooks/usePopupGeometrySave';
import type { LogDetail } from '../types/log';

type Mode = 'view' | 'edit';

export function LogViewPopupPage() {
  useAuthInit();
  usePopupGeometrySave('popup_log_view');
  const { currentUser, isLoading } = useAuthStore();
  const logId = Number(new URLSearchParams(window.location.search).get('id')) || null;
  // 카드 링크(…?id=일지#card-카드)로 열면 그 카드로 내려가 잠깐 강조
  const cardId = Number(window.location.hash.match(/^#card-(\d+)$/)?.[1]) || null;
  const [mode, setMode] = useState<Mode>('view');

  useEffect(() => {
    if (!isLoading && (!currentUser || !logId)) window.close();
  }, [isLoading, currentUser, logId]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-slate-900">
        <LoadingSpinner size={36} />
      </div>
    );
  }

  if (!currentUser || !logId) return null;

  const handleSaved = (log: LogDetail) => {
    const ch = new BroadcastChannel('skywatch-log');
    ch.postMessage({ type: 'log-saved', logId: log.id });
    ch.close();
    setMode('view');
  };

  if (mode === 'edit') {
    return (
      <LogWriteModal
        isFullPage
        logId={logId}
        onClose={() => setMode('view')}
        onSaved={handleSaved}
      />
    );
  }

  return (
    <LogDetailModal
      isFullPage
      logId={logId}
      initialCardId={cardId}
      onClose={() => window.close()}
      onEdit={() => setMode('edit')}
      onDeleted={() => window.close()}
    />
  );
}
