import { useEffect, useState } from 'react';
import { categoriesApi } from '../services/api/categoriesApi';
import type { CardCategory } from '../types/log';

export function useCategories() {
  const [categories, setCategories] = useState<CardCategory[]>([]);

  useEffect(() => {
    categoriesApi.list().then(res => {
      setCategories(res.data.data ?? []);
    }).catch(() => {});
  }, []);

  return { categories };
}
