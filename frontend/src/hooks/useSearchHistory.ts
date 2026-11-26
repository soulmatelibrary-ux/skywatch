import { useState, useCallback } from 'react';

const STORAGE_KEY = 'sw:search_history';
const MAX_HISTORY = 10;

function load(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); }
  catch { return []; }
}

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>(load);

  const add = useCallback((q: string) => {
    const t = q.trim();
    if (!t) return;
    setHistory(prev => {
      const next = [t, ...prev.filter(h => h !== t)].slice(0, MAX_HISTORY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const remove = useCallback((q: string) => {
    setHistory(prev => {
      const next = prev.filter(h => h !== q);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { history, add, remove };
}
