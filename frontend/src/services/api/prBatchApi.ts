import { apiClient } from './client';
import type { ApiResponse } from '../../types';
import type {
  PrBatch, PrBatchAttachment, PrBatchCreate, PrBatchItem,
  PrBatchItemCreate, PrBatchItemUpdate, PrBatchListParams,
  PrBatchListResponse, PrBatchUpdate,
  PrJudgment, PrVerificationDetail, PrVerificationSave,
} from '../../types/prBatch';

export const prBatchApi = {
  list: (params?: PrBatchListParams) =>
    apiClient.get<ApiResponse<PrBatchListResponse>>('/pr-batches', { params }),

  lookup: (params: { issue_id?: number; kac_pr_no?: string; lm_pr_no?: string }) =>
    apiClient.get<ApiResponse<{ batch_id: number; item_id: number }>>('/pr-batches/lookup', { params }),

  get: (id: number) =>
    apiClient.get<ApiResponse<PrBatch>>(`/pr-batches/${id}`),

  create: (data: PrBatchCreate) =>
    apiClient.post<ApiResponse<PrBatch>>('/pr-batches', data),

  patch: (id: number, data: PrBatchUpdate) =>
    apiClient.patch<ApiResponse<PrBatch>>(`/pr-batches/${id}`, data),

  remove: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/pr-batches/${id}`),

  addItem: (batchId: number, data: PrBatchItemCreate) =>
    apiClient.post<ApiResponse<PrBatchItem>>(`/pr-batches/${batchId}/items`, data),

  addItemsBulk: (batchId: number, items: PrBatchItemCreate[]) =>
    apiClient.post<ApiResponse<{ created: number }>>(`/pr-batches/${batchId}/items/bulk`, { items }),

  updateItem: (itemId: number, data: PrBatchItemUpdate) =>
    apiClient.patch<ApiResponse<null>>(`/pr-batches/items/${itemId}`, data),

  deleteItem: (itemId: number) =>
    apiClient.delete<ApiResponse<null>>(`/pr-batches/items/${itemId}`),

  saveVerification: (itemId: number, data: PrVerificationSave) =>
    apiClient.post<ApiResponse<{ id: number }>>(`/pr-batches/items/${itemId}/verifications`, data),

  getVerification: (verificationId: number) =>
    apiClient.get<ApiResponse<PrVerificationDetail>>(`/pr-batches/verifications/${verificationId}`),

  updateResult: (verificationId: number, result: PrJudgment) =>
    apiClient.patch<ApiResponse<null>>(`/pr-batches/verifications/${verificationId}/result`, { result }),

  deleteVerification: (verificationId: number) =>
    apiClient.delete<ApiResponse<null>>(`/pr-batches/verifications/${verificationId}`),

  importWorkbook: (batchId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<ApiResponse<{
      import_id: number; imported_items: number; filename: string; skipped_sheets: string[]; duplicate_sheets: string[];
    }>>(
      `/pr-batches/${batchId}/imports/workbook`, form, { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },

  // dryRun=true: 저장하지 않고 새로 등록될 개별 PR(new_issues)만 돌려받는다.
  importCatalogWorkbook: (batchId: number, file: File, dryRun = false) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<ApiResponse<{
      created_items: number; total_items: number; filename: string;
      created_issues: number; new_issues: { pr_no: string; title: string }[];
    }>>(
      `/pr-batches/${batchId}/imports/catalog${dryRun ? '?dry_run=true' : ''}`, form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },

  verificationReportUrl: (verificationId: number, download = false) =>
    `/api/pr-batches/verifications/${verificationId}/report${download ? '?download=1' : ''}`,

  templateUrl: (batchId: number, itemIds?: number[]) => {
    const params = new URLSearchParams();
    if (itemIds?.length) params.set('item_ids', itemIds.join(','));
    const qs = params.toString();
    return `/api/pr-batches/${batchId}/template${qs ? `?${qs}` : ''}`;
  },

  exportUrl: (batchId: number, opts: { userId?: number | null; itemIds?: number[] } = {}) => {
    const params = new URLSearchParams();
    if (opts.userId) params.set('user_id', String(opts.userId));
    if (opts.itemIds?.length) params.set('item_ids', opts.itemIds.join(','));
    const qs = params.toString();
    return `/api/pr-batches/${batchId}/export${qs ? `?${qs}` : ''}`;
  },

  workerWorkbookUrl: (batchId: number, userId: number) =>
    `/api/pr-batches/${batchId}/workbooks/${userId}`,

  uploadAttachment: (batchId: number, file: File, docType: string) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<ApiResponse<PrBatchAttachment>>(
      `/pr-batches/${batchId}/attachments?doc_type=${encodeURIComponent(docType)}`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
  },

  deleteAttachment: (attId: number) =>
    apiClient.delete<ApiResponse<null>>(`/pr-batches/attachments/${attId}`),

  downloadUrl: (attId: number, download = false) =>
    `/api/pr-batches/attachments/${attId}/download${download ? '?download=1' : ''}`,
};
