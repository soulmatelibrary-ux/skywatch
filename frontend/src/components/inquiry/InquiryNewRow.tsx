// 신규 문의사항 입력 폼
import { useState } from 'react';
import { inquiryApi } from '../../services/api/inquiryApi';
import type { InquiryCreate, Inquiry } from '../../types/inquiry';
import { useUIStore } from '../../store/uiStore';
import { useLatestSwVersion } from '../../hooks/useLatestSwVersion';

interface Props {
  onSuccess: (inquiry: Inquiry) => void;
  currentDate: string;
}

export function InquiryNewRow({ onSuccess, currentDate }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<InquiryCreate>({
    occurred_date: currentDate,
    status: 'in_progress',
  });
  const addToast = useUIStore((s) => s.addToast);
  // 열 때마다 발생버전 기본값(가장 최근 입력 버전) — 이미 쓴 값은 덮지 않는다
  useLatestSwVersion(isOpen, v => setFormData(f => (f.sw_version ? f : { ...f, sw_version: v })));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.occurred_date) {
      addToast('발생일자는 필수입니다', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const resp = await inquiryApi.create(formData);
      onSuccess(resp.data.data as Inquiry);
      setFormData({ occurred_date: currentDate, status: 'in_progress' });
      setIsOpen(false);
      addToast('등록되었습니다', 'success');
    } catch (error) {
      console.error('Inquiry creation failed:', error);
      const msg = error instanceof Error ? error.message : '등록 실패';
      addToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-sky-600 px-3.5 py-1.5 text-[13px] font-semibold text-white hover:bg-sky-700 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
      >
        새 문의사항
      </button>
    );
  }

  const fieldCls = 'w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[13px] text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100';
  const labelCls = 'mb-0.5 text-[12px] font-semibold text-slate-500 dark:text-slate-400';

  return (
    <div className="w-full rounded-xl border border-sky-300 bg-white p-4 dark:border-sky-800 dark:bg-slate-900">
      <form onSubmit={handleSubmit} className="space-y-2.5">
        {/* Row 1: 6열 */}
        <div className="grid grid-cols-6 gap-2">
          <div>
            <label className={labelCls}>발생일자 <span className="text-red-500">*</span></label>
            <input type="date" value={formData.occurred_date}
              onChange={e => setFormData({ ...formData, occurred_date: e.target.value })}
              required className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>시간(z)</label>
            <input type="text" placeholder="1932z" value={formData.occurred_time || ''}
              onChange={e => setFormData({ ...formData, occurred_time: e.target.value || undefined })}
              className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>관제사(섹터)</label>
            <input type="text" value={formData.controller_sector || ''}
              onChange={e => setFormData({ ...formData, controller_sector: e.target.value || undefined })}
              className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>발생버전</label>
            <input type="text" placeholder="6.5" value={formData.sw_version || ''}
              onChange={e => setFormData({ ...formData, sw_version: e.target.value || undefined })}
              className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>카테고리</label>
            <input type="text" value={formData.category || ''}
              onChange={e => setFormData({ ...formData, category: e.target.value || undefined })}
              className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>키워드</label>
            <input type="text" value={formData.keyword || ''}
              onChange={e => setFormData({ ...formData, keyword: e.target.value || undefined })}
              className={fieldCls} />
          </div>
        </div>

        {/* Row 2: 상세내용 + 비고 + 버튼 */}
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <div>
            <label className={labelCls}>상세내용</label>
            <textarea value={formData.content || ''}
              onChange={e => setFormData({ ...formData, content: e.target.value || undefined })}
              placeholder="상세 내용" rows={2} className={`${fieldCls} resize-none`} />
          </div>
          <div>
            <label className={labelCls}>비고</label>
            <textarea value={formData.note || ''}
              onChange={e => setFormData({ ...formData, note: e.target.value || undefined })}
              placeholder="참고사항" rows={2} className={`${fieldCls} resize-none`} />
          </div>
          <div className="flex gap-1.5 pb-0.5">
            <button type="button" onClick={() => setIsOpen(false)} disabled={isSaving}
              className="text-[12px] px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-white disabled:opacity-50 dark:border-slate-600 dark:text-slate-400">
              취소
            </button>
            <button type="submit" disabled={isSaving}
              className="rounded-lg bg-sky-600 px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-sky-700 disabled:opacity-50 dark:bg-sky-500 dark:text-slate-950">
              {isSaving ? '등록 중...' : '등록'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
