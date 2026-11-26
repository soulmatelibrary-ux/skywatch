import { useState, useCallback, useEffect } from 'react';
import { techDocsApi } from '../services/api/techDocsApi';
import type { CategoryTree, TechDocListItem } from '../types/techDoc';

export interface SearchParams {
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  semantic?: boolean;
}

export function useTechDocList() {
  const [categories, setCategories] = useState<CategoryTree[]>([]);
  const [items, setItems] = useState<TechDocListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedProjectCode, setSelectedProjectCode] = useState<string | null>(null);
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [semantic, setSemantic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const PAGE_SIZE = 50;

  const loadCategories = useCallback(async () => {
    try {
      const res = await techDocsApi.fetchCategories();
      setCategories(res.data.data ?? []);
    } catch {
      setCategories([]);
    }
  }, []);

  const loadDocs = useCallback(async (
    projectCode: string | null,
    categoryCode: string | null,
    q: string,
    df: string,
    dt: string,
    pg: number,
    sem: boolean,
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await techDocsApi.fetchTechDocs({
        project_code: projectCode ?? undefined,
        category_code: categoryCode ?? undefined,
        q: q || undefined,
        date_from: df || undefined,
        date_to: dt || undefined,
        page: pg,
        page_size: PAGE_SIZE,
        semantic: sem || undefined,
      });
      const data = res.data.data;
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setError('목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => {
    loadDocs(selectedProjectCode, selectedCategoryCode, searchQuery, dateFrom, dateTo, page, semantic);
  }, [loadDocs, selectedProjectCode, selectedCategoryCode, searchQuery, dateFrom, dateTo, page, semantic]);

  const selectCategory = useCallback((projectCode: string | null, categoryCode: string | null) => {
    setSelectedProjectCode(projectCode);
    setSelectedCategoryCode(categoryCode);
    setPage(1);
  }, []);

  const search = useCallback((params: SearchParams) => {
    setSearchQuery(params.q ?? '');
    setDateFrom(params.dateFrom ?? '');
    setDateTo(params.dateTo ?? '');
    setSemantic(params.semantic ?? false);
    setPage(1);
  }, []);

  const refresh = useCallback(() => {
    loadDocs(selectedProjectCode, selectedCategoryCode, searchQuery, dateFrom, dateTo, page, semantic);
  }, [loadDocs, selectedProjectCode, selectedCategoryCode, searchQuery, dateFrom, dateTo, page, semantic]);

  return {
    categories, items, total, page, setPage, pageSize: PAGE_SIZE,
    selectedProjectCode, selectedCategoryCode,
    searchQuery, dateFrom, dateTo, semantic,
    selectCategory, search, refresh,
    isLoading, error,
  };
}
