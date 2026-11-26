import { apiClient } from './client';
import type { ApiResponse } from '../../types';
import type {
  Issue, IssueAttachment, IssueComment,
  IssueCreate, IssueListParams, IssueListResponse, IssueUpdate,
} from '../../types/issue';

export const issueApi = {
  list: (params?: IssueListParams) =>
    apiClient.get<ApiResponse<IssueListResponse>>('/issues', { params }),

  get: (id: number) =>
    apiClient.get<ApiResponse<Issue>>(`/issues/${id}`),

  create: (data: IssueCreate) =>
    apiClient.post<ApiResponse<Issue>>('/issues', data),

  patch: (id: number, data: IssueUpdate) =>
    apiClient.patch<ApiResponse<Issue>>(`/issues/${id}`, data),

  remove: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/issues/${id}`),

  addComment: (issueId: number, content: string, is_certified = false) =>
    apiClient.post<ApiResponse<IssueComment>>(`/issues/${issueId}/comments`, {
      content,
      is_certified,
    }),

  deleteComment: (commentId: number) =>
    apiClient.delete<ApiResponse<null>>(`/issues/comments/${commentId}`),

  deleteAttachment: (attId: number) =>
    apiClient.delete<ApiResponse<null>>(`/issues/attachments/${attId}`),

  uploadAttachment: (issueId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<ApiResponse<IssueAttachment>>(
      `/issues/${issueId}/attachments`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },

  downloadUrl: (attachmentId: number, download = false) =>
    `/api/attachments/${attachmentId}/download${download ? '?download=1' : ''}`,

  viewUrl: (attachmentId: number) =>
    `/api/attachments/${attachmentId}/download`,
};
