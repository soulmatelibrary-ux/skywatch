import { useEffect, useState } from 'react';
import { useAuthInit } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { InquiryDetailPanel } from '../components/inquiry/InquiryDetailPanel';
import { inquiryApi } from '../services/api/inquiryApi';
import { usePopupGeometrySave } from '../hooks/usePopupGeometrySave';
import { setWindowTitle } from '../utils/popupGeometry';
import type { Inquiry } from '../types/inquiry';

export function InquiryViewPopupPage() {
  useAuthInit();
  usePopupGeometrySave('popup_inquiry_view');
  const { currentUser, isLoading: authLoading } = useAuthStore();
  const inquiryId = Number(new URLSearchParams(window.location.search).get('id')) || null;
  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (!authLoading && (!currentUser || !inquiryId)) window.close();
  }, [authLoading, currentUser, inquiryId]);

  useEffect(() => {
    if (!inquiryId) return;
    setFetching(true);
    inquiryApi.get(inquiryId)
      .then(res => setInquiry(res.data.data ?? null))
      .catch(() => setFetchError(true))
      .finally(() => setFetching(false));
  }, [inquiryId]);

  // 창 제목 "문의 H19155 · 내용 앞부분" — 여러 창을 띄웠을 때 작업표시줄에서 구분
  useEffect(() => {
    if (inquiry) setWindowTitle(`문의 ${inquiry.inquiry_no} · ${(inquiry.content ?? '').replace(/\s+/g, ' ').slice(0, 40)}`);
  }, [inquiry]);

  if (authLoading || fetching) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-slate-900">
        <LoadingSpinner size={36} />
      </div>
    );
  }

  if (!currentUser || !inquiryId) return null;

  if (fetchError || !inquiry) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-900">
        <p className="text-slate-500 dark:text-slate-400 text-[14px]">데이터를 불러오지 못했습니다.</p>
        <button
          onClick={() => window.close()}
          className="text-[13px] px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          닫기
        </button>
      </div>
    );
  }

  const handleSave = (updated: Inquiry) => {
    setInquiry(updated);
    const ch = new BroadcastChannel('skywatch-inquiry');
    ch.postMessage({ type: 'inquiry-saved', id: updated.id });
    ch.close();
  };

  return (
    <InquiryDetailPanel
      isFullPage
      inquiry={inquiry}
      isOpen={true}
      onClose={() => window.close()}
      onSave={handleSave}
    />
  );
}
