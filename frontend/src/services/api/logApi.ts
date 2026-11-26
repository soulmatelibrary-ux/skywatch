import { apiClient } from './client';
import type { ApiResponse } from '../../types';
import type {
  CardChainNode, CardLinkResult, CardUpdatePayload,
  CommentWithReplies, Log, LogCard, LogCreatePayload, LogDetail,
  LogLinkedCard, LogUpdatePayload, ReadStatus,
} from '../../types/log';

export const logApi = {
  create: (data: LogCreatePayload) =>
    apiClient.post<ApiResponse<LogDetail>>('/logs', data),

  update: (id: number, data: LogUpdatePayload) =>
    apiClient.put<ApiResponse<LogDetail>>(`/logs/${id}`, data),

  list: (params?: {
    page?: number; per_page?: number; team?: string;
    date_from?: string; date_to?: string; q?: string;
    category_id?: number; exclude_notice?: boolean;
  }) => apiClient.get<ApiResponse<Log[]>>('/logs', { params }),

  get: (id: number) =>
    apiClient.get<ApiResponse<LogDetail>>(`/logs/${id}`),

  ack: (id: number) =>
    apiClient.post<ApiResponse<null>>(`/logs/${id}/ack`),

  acknowledge: (id: number) =>
    apiClient.post<ApiResponse<null>>(`/logs/${id}/acknowledge`),

  getReads: (id: number) =>
    apiClient.get<ApiResponse<ReadStatus>>(`/logs/${id}/reads`),

  getComments: (id: number) =>
    apiClient.get<ApiResponse<CommentWithReplies[]>>(`/logs/${id}/comments`),

  addComment: (id: number, data: { body: string; parent_id?: number }) =>
    apiClient.post<ApiResponse<CommentWithReplies>>(`/logs/${id}/comments`, data),

  getLinkedCards: (id: number) =>
    apiClient.get<ApiResponse<LogLinkedCard[]>>(`/logs/${id}/linked-cards`),

  delete: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/logs/${id}`),
};

export const cardApi = {
  get: (id: number) =>
    apiClient.get<ApiResponse<LogCard>>(`/cards/${id}`),

  updateStatus: (id: number, status: string) =>
    apiClient.patch<ApiResponse<null>>(`/cards/${id}/status`, { status }),

  update: (id: number, data: CardUpdatePayload) =>
    apiClient.patch<ApiResponse<LogCard>>(`/cards/${id}`, data),

  delete: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/cards/${id}`),

  searchLinks: (q: string) =>
    apiClient.get<ApiResponse<CardLinkResult[]>>('/cards/link-search', { params: { q } }),

  getChain: (id: number) =>
    apiClient.get<ApiResponse<CardChainNode[]>>(`/cards/${id}/chain`),

  completeChain: (id: number) =>
    apiClient.patch<ApiResponse<null>>(`/cards/${id}/complete-chain`),

  linkToChain: (sourceCardId: number, targetCardId: number) =>
    apiClient.post<ApiResponse<null>>(`/cards/${sourceCardId}/chain`, { target_card_id: targetCardId }),

  unlinkFromChain: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/cards/${id}/chain`),

  carryOver: (id: number) =>
    apiClient.post<ApiResponse<LogCard>>(`/cards/${id}/carry-over`),
};

export const commentApi = {
  delete: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/comments/${id}`),

  toggleReaction: (id: number, emoji: string) =>
    apiClient.post<ApiResponse<null>>(`/comments/${id}/reactions`, { emoji }),
};
