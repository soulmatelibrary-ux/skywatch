import { useEffect } from 'react';
import { useAuthInit } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { LinkChainModal } from '../components/logs/LinkChainModal';

export function LogChainPopupPage() {
  useAuthInit();
  const { currentUser, isLoading } = useAuthStore();

  const params = new URLSearchParams(window.location.search);
  const cardId = Number(params.get('cardId')) || null;
  const cardTitle = params.get('title') ?? '';

  useEffect(() => {
    if (!isLoading && (!currentUser || !cardId)) window.close();
  }, [isLoading, currentUser, cardId]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-slate-900">
        <LoadingSpinner size={36} />
      </div>
    );
  }

  if (!currentUser || !cardId) return null;

  return (
    <LinkChainModal
      isFullPage
      cardId={cardId}
      cardTitle={cardTitle}
      onClose={() => window.close()}
    />
  );
}
