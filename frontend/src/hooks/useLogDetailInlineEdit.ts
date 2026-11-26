import { useCallback, useEffect, useState } from 'react';
import { cardApi } from '../services/api/logApi';
import { attachmentApi } from '../services/api/attachmentApi';
import type { Attachment, LogDetail } from '../types/log';

export interface EditCardState {
  id: number;
  title: string;
  content: string;
  category_id: number | null;
  attachments: Attachment[];
}

export function useLogDetailInlineEdit(detail: LogDetail | null) {
  const [editCards, setEditCards] = useState<EditCardState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detailId = detail?.id;
  useEffect(() => {
    if (!detail) return;
    setEditCards(detail.cards.map(c => ({
      id: c.id,
      title: c.title,
      content: c.content ?? '',
      category_id: c.category_id ?? null,
      attachments: c.attachments ?? [],
    })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailId]);

  const updateCard = useCallback(
    (id: number, patch: Partial<Pick<EditCardState, 'title' | 'content' | 'category_id'>>) => {
      setEditCards(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
    }, []
  );

  const handleUpload = useCallback(async (cardId: number, files: File[]) => {
    for (const file of files) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const att = await attachmentApi.upload('card', cardId, file) as any;
        setEditCards(prev => prev.map(c =>
          c.id === cardId ? { ...c, attachments: [...c.attachments, att as Attachment] } : c
        ));
      } catch { /* ignore */ }
    }
  }, []);

  const softDeleteAttachment = useCallback(async (cardId: number, attachmentId: number) => {
    try {
      await attachmentApi.delete(attachmentId);
      setEditCards(prev => prev.map(c =>
        c.id === cardId ? { ...c, attachments: c.attachments.filter(a => a.id !== attachmentId) } : c
      ));
    } catch { /* ignore */ }
  }, []);

  const save = useCallback(async (): Promise<boolean> => {
    if (!detail) return false;
    setIsSubmitting(true);
    setError(null);
    try {
      const results = await Promise.allSettled(
        editCards.map(c =>
          cardApi.update(c.id, { title: c.title, content: c.content, category_id: c.category_id })
        )
      );
      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        setError(`${failed.length}개 카드 저장에 실패했습니다`);
        return false;
      }
      return true;
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? '저장에 실패했습니다');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [detail, editCards]);

  return { editCards, updateCard, handleUpload, softDeleteAttachment, isSubmitting, error, save };
}
