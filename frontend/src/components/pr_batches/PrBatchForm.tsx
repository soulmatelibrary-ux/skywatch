import { useState } from 'react';
import { prBatchApi } from '../../services/api/prBatchApi';
import type { PrBatch, PrBatchCreate } from '../../types/prBatch';
import { usePrCatalogImport } from '../../hooks/usePrCatalogImport';
import { useUIStore } from '../../store/uiStore';
import { localToday } from '../../utils/prBadge';
import { PrBatchExcelPick } from './PrBatchExcelPick';

const DEFAULT_SEGMENT = '시험평가시스템';

interface Props {
  initial?: PrBatch | null;
  onSaved: (createdId?: number) => void;
  onCancel: () => void;
}

/** 버전 기본 정보만 입력 — 배치번호는 서버가 자동 부여, 단계(상태) 관리는 하지 않음 */
export function PrBatchForm({ initial, onSaved, onCancel }: Props) {
  const [form, setForm] = useState({
    sw_version: initial?.sw_version ?? '',
    previous_version: initial?.previous_version ?? '',
    agreed_date: initial?.agreed_date ?? localToday(),
    verified_date: initial?.verified_date ?? '',
    skyline_version: initial?.skyline_version ?? '',
    adaptation_version: initial?.adaptation_version ?? '',
    test_segment: initial ? (initial.test_segment ?? '') : DEFAULT_SEGMENT,
    summary: initial?.summary ?? '',
    notes: initial?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [excel, setExcel] = useState<File | null>(null);
  const importCatalog = usePrCatalogImport(0, () => undefined);
  const addToast = useUIStore(s => s.addToast);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.sw_version.trim() || !form.agreed_date) {
      setError('버전과 수정일자를 입력하세요.');
      return;
    }
    if (form.verified_date && form.verified_date < form.agreed_date) {
      setError('검증완료일은 수정일자보다 빠를 수 없습니다.');
      return;
    }
    setSaving(true);
    setError('');
    const payload: PrBatchCreate = {
      sw_version: form.sw_version.trim(),
      previous_version: form.previous_version.trim() || null,
      agreed_date: form.agreed_date,
      verified_date: form.verified_date || null,
      skyline_version: form.skyline_version.trim() || null,
      adaptation_version: form.adaptation_version.trim() || null,
      test_segment: form.test_segment.trim() || null,
      summary: form.summary.trim() || null,
      notes: form.notes.trim() || null,
    };
    let createdId: number | undefined;
    try {
      if (initial) await prBatchApi.patch(initial.id, payload);
      else createdId = (await prBatchApi.create(payload)).data.data?.id;
    } catch {
      setError('저장하지 못했습니다. 잠시 후 다시 시도하세요.');
      setSaving(false);
      return;
    }
    // 버전은 이미 만들어졌다. 엑셀 반영이 취소·실패해도 버전은 남고, PR 목록 단계에서 다시 올릴 수 있다.
    if (createdId && excel && !(await importCatalog(excel, createdId))) {
      addToast('버전은 만들었습니다. PR 목록이 비어 있으면 [1. PR 목록] 단계에서 엑셀을 다시 올려 주세요.', 'warning');
    }
    setSaving(false);
    onSaved(createdId);
  };

  const inputCls = 'w-full text-[13px] border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-400';
  const labelCls = 'block text-[12px] text-slate-500 dark:text-slate-400 mb-1';

  return (
    <div className="p-5 space-y-3">
      <h3 className="font-bold text-[15px] text-slate-800 dark:text-slate-100">
        {initial ? '버전 정보 수정' : '신규 버전'}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>버전 <span className="text-red-500">*</span></label>
          <input className={inputCls} value={form.sw_version} autoFocus
            onChange={e => set('sw_version', e.target.value)} placeholder="예: SKYPROD 6.6g2" />
        </div>
        <div>
          <label className={labelCls}>수정일자 <span className="text-red-500">*</span></label>
          <input type="date" className={inputCls} value={form.agreed_date}
            onChange={e => set('agreed_date', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>이전 버전</label>
          <input className={inputCls} value={form.previous_version}
            onChange={e => set('previous_version', e.target.value)} placeholder="예: SKYPROD 6.6g1" />
        </div>
        <div>
          <label className={labelCls}>검증완료일 <span className="text-slate-400">— 검증이 끝나면 입력</span></label>
          <input type="date" className={inputCls} value={form.verified_date}
            onChange={e => set('verified_date', e.target.value)} />
        </div>
      </div>
      <fieldset className="rounded-lg border border-slate-200 px-3 pb-3 pt-1 dark:border-slate-700">
        <legend className="px-1 text-[12px] font-semibold text-slate-600 dark:text-slate-300">보고서 기본값</legend>
        <p className="mb-2 text-[11px] text-slate-400">이 버전의 모든 검증 보고서(시험 확인서)에 자동으로 들어갑니다. 보고서마다 바꿀 수도 있습니다.</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Skyline 버전</label>
            <input className={inputCls} maxLength={100} value={form.skyline_version}
              onChange={e => set('skyline_version', e.target.value)} placeholder={`비우면 ${form.sw_version || '버전'}`} />
          </div>
          <div>
            <label className={labelCls}>Adaptation 버전</label>
            <input className={inputCls} maxLength={100} value={form.adaptation_version}
              onChange={e => set('adaptation_version', e.target.value)} placeholder="예: skyline.skyprod.6.6h.1_DIV_1" />
          </div>
          <div>
            <label className={labelCls}>시험 세그먼트</label>
            <input className={inputCls} maxLength={100} value={form.test_segment}
              onChange={e => set('test_segment', e.target.value)} />
          </div>
        </div>
      </fieldset>
      <div>
        <label className={labelCls}>수정 내용</label>
        <textarea className={`${inputCls} resize-y`} rows={3} value={form.summary}
          onChange={e => set('summary', e.target.value)} placeholder="이번 버전에서 무엇을 고쳤는지" />
      </div>
      <div>
        <label className={labelCls}>검증 방법</label>
        <textarea className={`${inputCls} resize-y`} rows={3} value={form.notes}
          onChange={e => set('notes', e.target.value)} placeholder="어떻게 검증했는지 (시험 환경, 절차, 결과 요약 등)" />
      </div>

      {!initial && <PrBatchExcelPick file={excel} onChange={setExcel} disabled={saving} />}

      {error && <p className="text-[12px] text-red-500">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel}
          className="text-[13px] px-4 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
          취소
        </button>
        <button onClick={handleSubmit} disabled={saving}
          className="text-[13px] px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg disabled:opacity-50">
          {saving ? (excel ? '목록 만드는 중…' : '저장 중…') : initial ? '저장' : excel ? '버전 만들고 목록 채우기' : '버전 만들기'}
        </button>
      </div>
    </div>
  );
}
