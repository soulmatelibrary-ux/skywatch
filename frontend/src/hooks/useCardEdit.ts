import { useCallback, useState } from 'react';
import { cardApi } from '../services/api/logApi';
import type { LogCard } from '../types/log';

export function useCardEdit(onUpdated: (card: LogCard) => void) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startEdit = useCallback((id: number) => setEditingId(id), []);
  const cancelEdit = useCallback(() => setEditingId(null), []);

  const save = useCallback(async (
    cardId: number,
    data: { title: string; content: string; category_id: number | null }
  ) => {
    setIsSubmitting(true);
    try {
      const res = await cardApi.update(cardId, data);
      if (res.data.data) onUpdated(res.data.data);
      setEditingId(null);
    } finally {
      setIsSubmitting(false);
    }
  }, [onUpdated]);

  return { editingId, isSubmitting, startEdit, cancelEdit, save };
}
