import { useCallback, useEffect, useRef, useState } from 'react';
import { cardApi } from '../services/api/logApi';
import type { CardLinkResult } from '../types/log';

export function useLinkSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CardLinkResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = useCallback(() => { setIsOpen(true); setQuery(''); setResults([]); }, []);
  const close = useCallback(() => { setIsOpen(false); setQuery(''); setResults([]); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await cardApi.searchLinks(query);
        setResults(res.data.data ?? []);
      } catch { /* ignore */ } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  return { query, setQuery, results, isOpen, isLoading, open, close };
}
