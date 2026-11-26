import { useState } from 'react';
import type { UnifiedSearchItem } from '../types/search';
import type { Inquiry } from '../types/inquiry';
import { inquiryApi } from '../services/api/inquiryApi';

export function useSearchModal() {
  const [viewLogId, setViewLogId] = useState<number | null>(null);
  const [viewCardId, setViewCardId] = useState<number | null>(null);
  const [viewCommentId, setViewCommentId] = useState<number | null>(null);
  const [viewInquiry, setViewInquiry] = useState<Inquiry | null>(null);

  const handleOpen = async (item: UnifiedSearchItem) => {
    if (
      item.target_type === 'log' ||
      item.target_type === 'card' ||
      item.target_type === 'comment'
    ) {
      const match = item.route.match(/open=(\d+)/);
      if (match) {
        setViewLogId(Number(match[1]));
        setViewCardId(Number(item.route.match(/card=(\d+)/)?.[1]) || null);
        setViewCommentId(Number(item.route.match(/comment=(\d+)/)?.[1]) || null);
      }
    } else if (item.target_type === 'inquiry') {
      try {
        const res = await inquiryApi.get(item.target_id);
        if (res.data?.data) setViewInquiry(res.data.data);
      } catch {
        // silent — inquiry fetch failure should not break search UX
      }
    } else if (item.target_type === 'tech_doc') {
      let b = { width: 1200, height: 850, left: -1, top: -1 };
      try { const s = localStorage.getItem('techDocPopupBounds'); if (s) b = { ...b, ...JSON.parse(s) }; } catch {}
      const w = Math.max(600, b.width);
      const h = Math.max(400, b.height);
      const left = b.left >= 0 ? Math.min(b.left, screen.width - w) : Math.round((screen.width - w) / 2);
      const top = b.top >= 0 ? Math.min(b.top, screen.height - h) : Math.round((screen.height - h) / 2);
      window.open(
        `/tech-docs-popup?id=${item.target_id}`,
        'techDocs',
        `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`,
      );
    } else if (item.target_type === 'issue') {
      const w = 1100;
      const h = 820;
      const left = Math.round((screen.width - w) / 2);
      const top = Math.round((screen.height - h) / 2);
      window.open(
        item.route || `/issues/view-popup?id=${item.target_id}`,
        `issue_search_${item.target_id}`,
        `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`,
      );
    }
  };

  return {
    viewLogId,
    viewCardId,
    viewCommentId,
    closeLog: () => { setViewLogId(null); setViewCardId(null); setViewCommentId(null); },
    viewInquiry,
    closeInquiry: () => setViewInquiry(null),
    handleOpen,
  };
}
