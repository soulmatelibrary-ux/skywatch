import { apiClient } from './client';
import type { ApiResponse } from '../../types';
import type { UnifiedSearchResult } from '../../types/search';

export interface SearchSuggestionItem {
  query_text: string;
  search_count: number;
}

export const searchApi = {
  unified: (params: {
    q?: string;
    source?: 'all' | 'skywatch';
    target?: 'all' | 'card' | 'comment' | 'inquiry' | 'issue' | 'log' | 'tech_doc';
    page?: number;
    page_size?: number;
    date_from?: string;
    date_to?: string;
    status?: string;
    team?: string;
  }) => apiClient.get<ApiResponse<UnifiedSearchResult>>('/search/unified', { params }),

  suggestions: (q: string) =>
    apiClient.get<ApiResponse<SearchSuggestionItem[]>>('/search/suggestions', { params: { q } }),
};
