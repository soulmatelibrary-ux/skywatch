// 홈 카드용 오늘 수집 키워드 게시글 조회 훅
import { useEffect, useState } from 'react';
import { skynetApi } from '../../services/api/skynetApi';
import type { SkynetBoardPost } from '../../types/skynet';

export function useSkynetTodayBoard() {
  const [posts, setPosts] = useState<SkynetBoardPost[]>([]);
  const [boardDirectUrl, setBoardDirectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    skynetApi.todayBoard()
      .then(res => { setPosts(res.items); setBoardDirectUrl(res.board_direct_url); })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return { posts, boardDirectUrl, loading };
}
