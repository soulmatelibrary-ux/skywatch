import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComposerPrefill } from '../components/shiftlog/CardComposer';
import { workThreadApi } from '../services/api/workThreadApi';
import type { WorkThread } from '../types/shiftLog';

/**
 * 입력창에 연결할 과제 목록 = 진행·보류 과제 + 다시 이어 쓰려고 고른 종료된 과제.
 * 종료된 과제에 카드를 저장하면 서버가 과제를 다시 '진행'으로 돌리므로, 입력창에는 저장 전까지 임시로 넣어 둔다.
 * 과제 보드·카드 검색에서 ?thread= 로 넘어온 종료된 과제도 여기서 찾아 채운다.
 */
export function useResumedThreads(prefill: ComposerPrefill | null, open: WorkThread[], loading: boolean) {
  const [extra, setExtra] = useState<WorkThread[]>([]);
  const add = useCallback((t: WorkThread) => setExtra(prev => (prev.some(x => x.id === t.id) ? prev : [...prev, t])), []);

  useEffect(() => {
    const id = prefill?.threadId;
    if (!id || loading || open.some(t => t.id === id) || extra.some(t => t.id === id)) return;
    let alive = true;
    workThreadApi.get(id).then(res => { if (alive && res.data.data) add(res.data.data); }).catch(() => undefined);
    return () => { alive = false; };
  }, [prefill, loading, open, extra, add]);

  const threads = useMemo(() => [...open, ...extra.filter(e => !open.some(t => t.id === e.id))], [open, extra]);
  return { threads, add };
}
