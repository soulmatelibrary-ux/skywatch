import { useCallback, useEffect, useState } from 'react';
import { taskApi } from '../services/api/taskApi';
import type { RecurringTemplate, RecurringTemplateCreate } from '../types/task';

export function useTemplates() {
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await taskApi.templates.list();
      setTemplates(r.data.data ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (data: RecurringTemplateCreate): Promise<RecurringTemplate> => {
    const r = await taskApi.templates.create(data);
    const t = r.data.data!;
    setTemplates(prev => [...prev, t]);
    return t;
  };

  const update = async (id: number, data: Partial<RecurringTemplateCreate>): Promise<RecurringTemplate> => {
    const r = await taskApi.templates.update(id, data);
    const t = r.data.data!;
    setTemplates(prev => prev.map(x => x.id === id ? t : x));
    return t;
  };

  const toggle = async (id: number): Promise<RecurringTemplate> => {
    const r = await taskApi.templates.toggle(id);
    const t = r.data.data!;
    setTemplates(prev => prev.map(x => x.id === id ? t : x));
    return t;
  };

  const remove = async (id: number): Promise<void> => {
    await taskApi.templates.remove(id);
    setTemplates(prev => prev.filter(x => x.id !== id));
  };

  return { templates, isLoading, load, create, update, toggle, remove };
}
