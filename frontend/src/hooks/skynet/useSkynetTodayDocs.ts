// 홈 카드용 오늘 수집 키워드 문서 조회 훅
import { useEffect, useState } from 'react';
import { skynetApi } from '../../services/api/skynetApi';
import type { SkynetDocument } from '../../types/skynet';

export function useSkynetTodayDocs() {
  const [docs, setDocs] = useState<SkynetDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    skynetApi.todayDocs()
      .then(res => setDocs(res.items))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, []);

  return { docs, loading };
}
