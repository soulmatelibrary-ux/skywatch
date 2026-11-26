import { apiClient } from './client';
import type { ApiResponse } from '../../types';
import type { Attachment, AttachmentSearchResult } from '../../types/attachment';

function toAttachment(raw: Record<string, unknown>): Attachment {
  return {
    id:            raw.id as number,
    owner_type:    (raw.owner_type ?? 'card') as string,
    owner_id:      (raw.owner_id ?? raw.card_id) as number,
    original_name: raw.original_name as string,
    file_name:     raw.file_name as string,
    file_path:     raw.file_name as string,
    file_size:     raw.file_size as number,
    mime_type:     (raw.mime_type ?? null) as string | null,
    uploaded_by:   raw.uploaded_by as number,
    created_at:    raw.created_at as string,
  };
}

export const attachmentApi = {
  list: async (_ownerType: string, cardId: number): Promise<Attachment[]> => {
    const res = await apiClient.get<ApiResponse<unknown[]>>(`/cards/${cardId}/attachments`);
    return (res.data.data ?? []).map(a => toAttachment(a as Record<string, unknown>));
  },

  upload: async (
    _ownerType: string,
    cardId: number,
    file: File,
    onProgress?: (pct: number) => void,
  ): Promise<Attachment> => {
    const form = new FormData();
    form.append('file', file);
    const res = await apiClient.post<ApiResponse<unknown>>(
      `/cards/${cardId}/attachments`,
      form,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: onProgress
          ? (e) => { if (e.total) onProgress(Math.round((e.loaded / e.total) * 100)); }
          : undefined,
      },
    );
    return toAttachment(res.data.data as Record<string, unknown>);
  },

  delete: (attachmentId: number) =>
    apiClient.delete<ApiResponse<null>>(`/cards/attachments/${attachmentId}`),

  downloadUrl: (attachmentId: number, download = false): string =>
    `/api/attachments/${attachmentId}/download${download ? '?download=1' : ''}`,

  viewUrl: (attachmentId: number): string =>
    `/api/attachments/${attachmentId}/download`,

  searchByName: async (q: string): Promise<AttachmentSearchResult[]> => {
    const res = await apiClient.get<ApiResponse<AttachmentSearchResult[]>>(
      `/attachments/search`,
      { params: { q } },
    );
    return res.data.data ?? [];
  },
};
