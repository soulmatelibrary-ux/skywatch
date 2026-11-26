// SkyNet API 호출 함수 모음
import { apiClient } from './client';
import type { SkynetDocument, SkynetBoardPost, SkynetDepartment, SkynetDashboard, SkynetPagedResult, SkynetSearchResult, SkynetBoardStats, SkynetDocStats, SkynetSourceDept } from '../../types/skynet';

export const skynetApi = {
  search: (params: { q: string; page?: number; size?: number; semantic?: boolean }) =>
    apiClient.get<SkynetSearchResult>('/skynet/search', { params }).then(r => r.data),

  vectorStatus: () =>
    apiClient.get<{ docs_total: number; docs_vectorized: number; board_total: number; board_vectorized: number; model: string; running: boolean }>('/skynet/vectors/status').then(r => r.data),

  vectorBackfill: () =>
    apiClient.post<{ ok: boolean; message: string }>('/skynet/vectors/backfill').then(r => r.data),

  departments: () =>
    apiClient.get<SkynetDepartment[]>('/skynet/departments').then(r => r.data),

  years: () =>
    apiClient.get<string[]>('/skynet/years').then(r => r.data),

  docStats: () =>
    apiClient.get<SkynetDocStats>('/skynet/doc-stats').then(r => r.data),

  sourceDepts: () =>
    apiClient.get<SkynetSourceDept[]>('/skynet/source-depts').then(r => r.data),

  documents: (params: { q?: string; dept?: string; year?: string; source_dept?: string; keyword_only?: boolean; page?: number; size?: number }) =>
    apiClient.get<SkynetPagedResult<SkynetDocument> & { total_pages: number }>('/skynet/documents', { params }).then(r => r.data),

  boardStats: () =>
    apiClient.get<SkynetBoardStats>('/skynet/board/stats').then(r => r.data),

  board: (params: { q?: string; page?: number; size?: number }) =>
    apiClient.get<SkynetPagedResult<SkynetBoardPost> & { total_pages: number }>('/skynet/board', { params }).then(r => r.data),

  dashboard: () =>
    apiClient.get<SkynetDashboard>('/skynet/dashboard').then(r => r.data),

  crawlStatus: () =>
    apiClient.get('/skynet/crawl/status').then(r => r.data),

  crawlStart: () =>
    apiClient.post('/skynet/crawl/start').then(r => r.data),

  boardCrawlNow: () =>
    apiClient.post('/skynet/board/crawl-now').then(r => r.data),

  allDepartments: () =>
    apiClient.get<{ id: number; name: string; dept_id: string; doc_type: string; enabled: number }[]>('/skynet/departments/all').then(r => r.data),

  toggleDepartment: (id: number, enabled: boolean) =>
    apiClient.patch(`/skynet/departments/${id}`, { enabled }).then(r => r.data),

  keywords: () =>
    apiClient.get<{ id: number; keyword: string; project_id: number | null }[]>('/skynet/keywords').then(r => r.data),

  addKeyword: (keyword: string) =>
    apiClient.post('/skynet/keywords', { keyword }).then(r => r.data),

  deleteKeyword: (id: number) =>
    apiClient.delete(`/skynet/keywords/${id}`),

  addDepartment: (data: { name: string; dept_id: string; doc_type: string }) =>
    apiClient.post('/skynet/departments', data).then(r => r.data),

  deleteDepartment: (id: number) =>
    apiClient.delete(`/skynet/departments/${id}`).then(r => r.data),

  boardKeywords: () =>
    apiClient.get<{ id: number; keyword: string }[]>('/skynet/board/keywords').then(r => r.data),

  addBoardKeyword: (keyword: string) =>
    apiClient.post<{ id: number; keyword: string }>('/skynet/board/keywords', { keyword }).then(r => r.data),

  deleteBoardKeyword: (id: number) =>
    apiClient.delete(`/skynet/board/keywords/${id}`).then(r => r.data),

  crawlSettings: () =>
    apiClient.get<{ auto_crawl_times: string[]; crawl_speed: string }>('/skynet/settings/crawl').then(r => r.data),

  saveCrawlSettings: (data: { auto_crawl_times: string[]; crawl_speed: string }) =>
    apiClient.post('/skynet/settings/crawl', data).then(r => r.data),

  setSession: (jsessionid: string) =>
    apiClient.post<{ ok: boolean; message?: string }>('/skynet/session', { jsessionid }).then(r => r.data),

  autoDetectSession: () =>
    apiClient.post<{ ok: boolean; message?: string }>('/skynet/session/auto').then(r => r.data),

  manualBatchCrawl: (params: { start_date: string; end_date: string; warmup_count: number; interval_seconds?: number; dept_names?: string[] }) =>
    apiClient.post<{ ok: boolean; message?: string; running?: boolean; auth_required?: boolean }>('/skynet/manual/batch', params).then(r => r.data),

  keywordsRematch: () =>
    apiClient.post<{ ok: boolean; total?: number; matched?: number }>('/skynet/keywords/rematch').then(r => r.data),

  keywordsRecrawl: () =>
    apiClient.post<{ ok: boolean; message?: string }>('/skynet/keywords/recrawl').then(r => r.data),

  todayDocs: () =>
    apiClient.get<{ items: SkynetDocument[]; date: string }>('/skynet/today-docs').then(r => r.data),

  todayBoard: () =>
    apiClient.get<{ items: SkynetBoardPost[]; date: string; board_direct_url: string | null }>('/skynet/today-board').then(r => r.data),

  saveDocumentMemo: (docId: number, memo: string) =>
    apiClient.post(`/skynet/documents/${docId}/memo`, { memo }).then(r => r.data),

  deleteBoardPosts: (postIds: number[]) =>
    apiClient.post<{ ok: boolean; message?: string }>('/skynet/board/posts/delete', { post_ids: postIds }).then(r => r.data),

  unmatchDocuments: (docIds: number[]) =>
    apiClient.post<{ ok: boolean; unmatched: number }>('/skynet/documents/unmatch', { doc_ids: docIds }).then(r => r.data),

  matchDocuments: (docIds: number[], keyword: string) =>
    apiClient.post<{ ok: boolean; matched: number }>('/skynet/documents/match', { doc_ids: docIds, keyword }).then(r => r.data),
};
