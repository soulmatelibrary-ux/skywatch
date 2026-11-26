import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCardStatuses } from '../../hooks/useCardStatuses';
import { logApi } from '../../services/api/logApi';
import type { LogDetail } from '../../types/log';
import { LogPdfView } from '../logs/LogPdfView';

interface Props {
  logId: number | null;
  onClose: () => void;
}

export function LogQuickViewModal({ logId, onClose }: Props) {
  const statuses = useCardStatuses();
  const [detail, setDetail] = useState<LogDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!logId) {
      setDetail(null);
      setError('');
      setIsLoading(false);
      return;
    }

    let alive = true;
    setIsLoading(true);
    setError('');
    setDetail(null);

    logApi.get(logId)
      .then(res => {
        if (!alive) return;
        setDetail(res.data.data ?? null);
      })
      .catch(() => {
        if (!alive) return;
        setError('Failed to load the log.');
      })
      .finally(() => {
        if (alive) setIsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [logId]);

  if (!logId) return null;

  if (isLoading || !detail) {
    return createPortal(
      <div className="fixed inset-0 z-[380] bg-black/50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          {error ? (
            <div className="text-center">
              <p className="text-[14px] font-semibold text-slate-800 mb-1">Quick View failed</p>
              <p className="text-[13px] text-slate-500 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-3 py-2 rounded-lg border border-slate-300 text-[13px] text-slate-600 hover:bg-slate-50 transition"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="text-center text-slate-500 text-[14px]">Loading log...</div>
          )}
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <LogPdfView detail={detail} statuses={statuses} onClose={onClose} />,
    document.body
  );
}
