import { useCallback, useEffect, useState } from 'react';
import { logApi, commentApi } from '../services/api/logApi';
import type { CommentWithReplies } from '../types/log';

export function useComments(logId: number | null) {
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [replyToId, setReplyToId] = useState<number | null>(null);
  const [replyToName, setReplyToName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!logId) { setComments([]); return; }
    logApi.getComments(logId).then(res => setComments(res.data.data ?? []));
  }, [logId]);

  const reload = useCallback(async () => {
    if (!logId) return;
    const res = await logApi.getComments(logId);
    setComments(res.data.data ?? []);
  }, [logId]);

  const submit = useCallback(async (body: string) => {
    if (!logId || !body.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await logApi.addComment(logId, { body, parent_id: replyToId ?? undefined });
      setReplyToId(null);
      setReplyToName('');
      await reload();
    } finally {
      setIsSubmitting(false);
    }
  }, [logId, replyToId, isSubmitting, reload]);

  const deleteComment = useCallback(async (commentId: number) => {
    await commentApi.delete(commentId);
    setComments(prev => prev
      .filter(c => c.id !== commentId)
      .map(c => ({ ...c, replies: c.replies.filter(r => r.id !== commentId) }))
    );
  }, []);

  const toggleReaction = useCallback(async (commentId: number, emoji: string) => {
    await commentApi.toggleReaction(commentId, emoji);
    await reload();
  }, [reload]);

  const startReply = useCallback((commentId: number, authorName: string) => {
    setReplyToId(commentId);
    setReplyToName(authorName);
  }, []);

  const cancelReply = useCallback(() => {
    setReplyToId(null);
    setReplyToName('');
  }, []);

  return {
    comments, replyToId, replyToName, isSubmitting,
    submit, deleteComment, toggleReaction, startReply, cancelReply,
  };
}
