import { useEffect } from 'react';
import { useAuthInit } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { LogWriteModal } from '../components/logs/LogWriteModal';
import type { LogDetail } from '../types/log';

export function LogCreatePopupPage() {
  useAuthInit();
  const { currentUser, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !currentUser) window.close();
  }, [isLoading, currentUser]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900/50">
        <LoadingSpinner size={36} />
      </div>
    );
  }

  if (!currentUser) return null;

  const editId = Number(new URLSearchParams(window.location.search).get('edit')) || null;

  const handleSaved = (log: LogDetail) => {
    const ch = new BroadcastChannel('skywatch-log');
    ch.postMessage({ type: 'log-saved', logId: log.id });
    ch.close();
    window.close();
  };

  return (
    <LogWriteModal isFullPage logId={editId} onClose={() => window.close()} onSaved={handleSaved} />
  );
}
