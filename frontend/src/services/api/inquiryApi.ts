// 문의사항 API 클라이언트
import { apiClient } from './client';
import type { ApiResponse } from '../../types';
import type { Inquiry, InquiryCreate, InquiryUpdate, InquiryListParams, InquiryListResponse } from '../../types/inquiry';

export const inquiryApi = {
  list: (params?: InquiryListParams) =>
    apiClient.get<ApiResponse<InquiryListResponse>>('/inquiries', { params }),

  get: (id: number) =>
    apiClient.get<ApiResponse<Inquiry>>(`/inquiries/${id}`),

  create: (data: InquiryCreate) =>
    apiClient.post<ApiResponse<Inquiry>>('/inquiries', data),

  patch: (id: number, data: InquiryUpdate) =>
    apiClient.patch<ApiResponse<Inquiry>>(`/inquiries/${id}`, data),

  remove: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/inquiries/${id}`),

  exportExcel: (params: {
    year?: number | null;
    month?: number | null;
    date_from?: string | null;
    date_to?: string | null;
    category?: string | null;
    status?: string | null;
    q?: string | null;
  }) =>
    apiClient.get('/inquiries/export/excel', {
      params,
      responseType: 'blob',
    }),

  categories: () =>
    apiClient.get<ApiResponse<string[]>>('/inquiries/meta/categories'),

  // 발생버전 기본값 — 가장 최근에 입력된 문의사항의 발생버전
  latestSwVersion: () =>
    apiClient.get<ApiResponse<string | null>>('/inquiries/meta/latest-sw-version'),

  import: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<ApiResponse<{
      total: number;
      success: number;
      skipped: number;
      errors: string[];
    }>>('/inquiries/import/bulk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
