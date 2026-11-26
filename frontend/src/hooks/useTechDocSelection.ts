import { useState } from 'react';
import { techDocsApi } from '../services/api/techDocsApi';

/** 관제시스템 문서 — 여러 문서 선택과 분류 한꺼번에 옮기기 */
export function useTechDocSelection(onMoved: () => void) {
  const [selectedIds, setSelectedIds] = useState(new Set<number>());
  const [showBulkMove, setShowBulkMove] = useState(false);

  const toggle = (id: number) => setSelectedIds(prev => {
    const s = new Set(prev);
    if (s.has(id)) s.delete(id); else s.add(id);
    return s;
  });

  const toggleAll = (ids: number[]) => setSelectedIds(prev =>
    ids.every(id => prev.has(id))
      ? new Set([...prev].filter(id => !ids.includes(id)))
      : new Set([...prev, ...ids]),
  );

  const clear = () => setSelectedIds(new Set());

  const moveSelected = async (pc: string | null, cc: string | null) => {
    try {
      await techDocsApi.bulkMoveCategory([...selectedIds], pc, cc);
      clear();
      setShowBulkMove(false);
      onMoved();
    } catch {
      alert('분류를 옮기지 못했습니다. 잠시 후 다시 시도하세요.');
    }
  };

  return { selectedIds, toggle, toggleAll, clear, showBulkMove, setShowBulkMove, moveSelected };
}
