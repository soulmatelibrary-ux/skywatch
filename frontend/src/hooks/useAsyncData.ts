import { useCallback, useEffect, useRef, useState } from 'react';

/** API 응답 data를 불러오고 다시 불러오기를 제공하는 공통 훅. 늦게 도착한 이전 응답은 무시한다. */
export function useAsyncData<T>(fetcher: () => Promise<T>, deps: unknown[], initial: T) {
  const [data, setData] = useState<T>(initial);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(fetcher, deps);

  const reload = useCallback(async () => {
    const my = ++seq.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await load();
      if (my === seq.current) setData(result);
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      if (my === seq.current) setError(typeof detail === 'string' ? detail : '불러오지 못했습니다.');
    } finally {
      if (my === seq.current) setIsLoading(false);
    }
  }, [load]);

  useEffect(() => { reload(); }, [reload]);

  return { data, setData, isLoading, error, reload };
}
