export type SearchSource = 'skywatch';
export type SearchTarget = 'log' | 'card' | 'comment' | 'inquiry' | 'tech_doc' | 'issue';

export interface UnifiedSearchItem {
  source: SearchSource;
  target_type: SearchTarget;
  target_id: number;
  title: string;
  snippet: string;
  score: number;
  updated_at: string;
  work_date?: string | null;
  author?: string | null;
  route: string;
  category?: string | null;
  attach_count?: number | null;
}

export interface UnifiedSearchFacets {
  by_source: Record<string, number>;
  by_target: Record<string, number>;
}

export interface ParsedIntent {
  periods: string[];
  teams: string[];
  statuses: string[];
  sources: string[];
}

export interface UnifiedSearchResult {
  items: UnifiedSearchItem[];
  facets: UnifiedSearchFacets;
  parsed_intent: ParsedIntent;
  partial: boolean;
  unavailable_sources: string[];
}
