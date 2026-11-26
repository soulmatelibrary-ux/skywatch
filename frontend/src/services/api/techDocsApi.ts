import { apiClient } from './client';
import type {
  Category,
  CategoryTree,
  CreateTechDocInput,
  TechDocDetail,
  TechDocListResponse,
  TechDocAttachment,
  TechDocCsvKind,
  UpdateTechDocInput,
} from '../../types/techDoc';
import type { CsvImportResult } from '../../types/csvImport';

export const techDocsApi = {
  fetchCategories: () =>
    apiClient.get<{ data: CategoryTree[] }>('/tech-docs/categories'),

  fetchCategoriesForManage: () =>
    apiClient.get<{ data: Category[] }>('/tech-docs/categories/manage'),

  createCategory: (data: { project_code: string; category_code: string; name: string; sort_order?: number }) =>
    apiClient.post<{ data: Category }>('/tech-docs/categories', data),

  updateCategory: (id: number, data: { name?: string; sort_order?: number; is_active?: boolean }) =>
    apiClient.put<{ data: Category }>(`/tech-docs/categories/${id}`, data),

  deleteCategory: (id: number) =>
    apiClient.delete(`/tech-docs/categories/${id}`),

  fetchTechDocs: (params: {
    project_code?: string;
    category_code?: string;
    doc_type?: string;
    q?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
    semantic?: boolean;
  }) => apiClient.get<{ data: TechDocListResponse }>('/tech-docs', { params }),

  fetchTechDocDetail: (id: number) =>
    apiClient.get<{ data: TechDocDetail }>(`/tech-docs/${id}`),

  createTechDoc: (data: CreateTechDocInput) =>
    apiClient.post<{ data: TechDocDetail }>('/tech-docs', data),

  updateTechDoc: (id: number, data: UpdateTechDocInput) =>
    apiClient.put<{ data: TechDocDetail }>(`/tech-docs/${id}`, data),

  deleteTechDoc: (id: number) =>
    apiClient.delete(`/tech-docs/${id}`),

  uploadAttachment: (docId: number, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post<{ data: TechDocAttachment }>(`/tech-docs/${docId}/attachments`, fd);
  },

  deleteAttachment: (attId: number) =>
    apiClient.delete(`/tech-docs/attachments/${attId}`),

  getAttachmentDownloadUrl: (attId: number, download = false) =>
    `/api/tech-docs/attachments/${attId}/download${download ? '?download=1' : ''}`,

  getAttachmentViewUrl: (attId: number) =>
    `/api/tech-docs/attachments/${attId}/download`,

  bulkMoveCategory: (ids: number[], project_code: string | null, category_code: string | null) =>
    apiClient.patch<{ data: number }>('/tech-docs/bulk-category', { ids, project_code, category_code }),

  importCsv: (kind: TechDocCsvKind, file: File, dryRun: boolean) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post<{ data: CsvImportResult }>(`/tech-docs-import/${kind}`, fd, { params: { dry_run: dryRun } });
  },
};
