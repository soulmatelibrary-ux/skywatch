// 벡터 검색 관리 API
import { apiClient } from './client';
import type { ApiResponse } from '../../types';

export interface VectorStatus {
  vectorized_count: number;
  total_count: number;
  coverage: number;
  current_model: string;
}

export interface ReindexJob {
  job_id: string;
  model: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  processed: number;
  total: number;
  error?: string;
  started_at?: string;
  completed_at?: string;
}

export interface VectorModel {
  id: string;
  name: string;
  dimension: number;
  speed: string;
  accuracy: string;
  size: string;
  is_active: boolean;
}

export interface CardVectorStatus {
  vectorized_count: number;
  total_count: number;
  coverage: number;
  model: string;
}

export interface SimpleVectorStatus {
  vectorized_count: number;
  total_count: number;
  coverage: number;
  model: string;
}

export const vectorApi = {
  getStatus: () =>
    apiClient.get<ApiResponse<VectorStatus>>('/vector/status'),

  startBackfill: () =>
    apiClient.post<ApiResponse<{ job_id: string; status: string }>>('/vector/backfill', {}),

  getJobStatus: (jobId: string) =>
    apiClient.get<ApiResponse<ReindexJob>>(`/vector/job/${jobId}`),

  getModels: () =>
    apiClient.get<ApiResponse<VectorModel[]>>('/vector/models'),

  getCardStatus: () =>
    apiClient.get<ApiResponse<CardVectorStatus>>('/vector/cards/status'),

  startCardBackfill: () =>
    apiClient.post<ApiResponse<{ status: string }>>('/vector/cards/backfill', {}),

  getInquiryStatus: () =>
    apiClient.get<ApiResponse<SimpleVectorStatus>>('/vector/inquiries/status'),

  startInquiryBackfill: () =>
    apiClient.post<ApiResponse<{ status: string }>>('/vector/inquiries/backfill', {}),

  getIssueStatus: () =>
    apiClient.get<ApiResponse<SimpleVectorStatus>>('/vector/issues/status'),

  startIssueBackfill: () =>
    apiClient.post<ApiResponse<{ status: string }>>('/vector/issues/backfill', {}),

  getTechDocStatus: () =>
    apiClient.get<ApiResponse<SimpleVectorStatus>>('/vector/tech-docs/status'),

  startTechDocBackfill: () =>
    apiClient.post<ApiResponse<{ status: string }>>('/vector/tech-docs/backfill', {}),
};
