import { useEffect, useRef, useState } from 'react';
import { searchApi, type SearchSuggestionItem } from '../services/api/searchApi';

const DEBOUNCE_MS = 300;
const MIN_LEN = 2;

export function useSearchSuggestions(inputValue: string, enabled: boolean) {
  const [suggestions, setSuggestions] = useState<SearchSuggestionItem[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timerRef.current);
    const q = inputValue.trim();

    if (!enabled || q.length < MIN_LEN) {
      setSuggestions([]);
      return;
    }

    timerRef.current = setTimeout(async () => {
      try {
        const res = await searchApi.suggestions(q);
        setSuggestions(res.data?.data ?? []);
      } catch {
        setSuggestions([]);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timerRef.current);
  }, [inputValue, enabled]);

  return { suggestions };
}
