import { useState } from 'react';
import type { CategoryTree } from '../../types/techDoc';
import { PROJECT_LABELS } from '../../constants/techDocLabels';

interface Props {
  count: number;
  categories: CategoryTree[];
  onConfirm: (projectCode: string | null, categoryCode: string | null) => Promise<void>;
  onClose: () => void;
}

export function TechDocBulkMoveModal({ count, categories, onConfirm, onClose }: Props) {
  const [projectCode, setProjectCode] = useState('');
  const [categoryCode, setCategoryCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const filteredCats = categories.find(t => t.project_code === projectCode)?.categories ?? [];

  const handleProjectChange = (val: string) => {
    setProjectCode(val);
    setCategoryCode('');
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(projectCode || null, categoryCode || null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl p-5 w-72 flex flex-col gap-3"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-semibold text-slate-800 text-sm">분류 이동</h3>
        <p className="text-xs text-slate-500">
          선택된 <span className="font-bold text-blue-600">{count}개</span> 문서의 분류를 변경합니다.
        </p>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-slate-600">프로젝트</label>
          <select
            value={projectCode}
            onChange={e => handleProjectChange(e.target.value)}
            className="border border-slate-300 rounded px-2 py-1.5 text-xs bg-white"
          >
            <option value="">(프로젝트 없음)</option>
            {categories.map(t => (
              <option key={t.project_code} value={t.project_code}>{PROJECT_LABELS[t.project_code] ?? t.project_code}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-slate-600">카테고리</label>
          <select
            value={categoryCode}
            onChange={e => setCategoryCode(e.target.value)}
            disabled={!projectCode}
            className="border border-slate-300 rounded px-2 py-1.5 text-xs bg-white disabled:opacity-50"
          >
            <option value="">(카테고리 없음)</option>
            {filteredCats.map(c => (
              <option key={c.category_code} value={c.category_code}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? '처리 중...' : '이동'}
          </button>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-100"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
