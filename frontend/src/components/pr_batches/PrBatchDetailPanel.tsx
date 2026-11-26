import { useState } from 'react';
import { prBatchApi } from '../../services/api/prBatchApi';
import type { PrBatch } from '../../types/prBatch';
import { useUIStore } from '../../store/uiStore';
import { PrBatchDocuments } from './PrBatchDocuments';
import { PrBatchForm } from './PrBatchForm';
import { PrBatchItemTable } from './PrBatchItemTable';
import { PrBatchVerificationPanel } from './PrBatchVerificationPanel';
import { PrBatchStepGuide } from './PrBatchStepGuide';
import { PrBatchTabs, type PrBatchTab } from './PrBatchTabs';
const BTN = 'text-[12px] px-3 py-1.5 rounded-lg border disabled:opacity-50';

interface Props {
  batch: PrBatch;
  onChanged: () => void;
  onDeleted: () => void;
  focusItemId?: number | null;
}

export function PrBatchDetailPanel({ batch, onChanged, onDeleted, focusItemId = null }: Props) {
  const [tab, setTab] = useState<PrBatchTab>(focusItemId ? 'verifications' : 'items');
  const [editing, setEditing] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const defaultsText = `Skyline ${batch.skyline_version || batch.sw_version} · Adaptation ${batch.adaptation_version || '미입력'} · ${batch.test_segment || '시험평가시스템'}`;
  const addToast = useUIStore(s => s.addToast);
  const verifiedCount = batch.items.filter(item => batch.verifications.some(v => v.item_id === item.id && v.report_original_name)).length;
  // 안내문은 그 단계에 아직 내용이 없을 때만 보여 준다 (내용이 생기면 목록이 위로 올라오도록)
  const stepEmpty = tab === 'items' ? batch.items.length === 0 : tab === 'verifications' ? verifiedCount === 0 : batch.attachments.length === 0;

  const deleteBatch = async () => {
    if (!confirm(`"${batch.sw_version}" 버전을 삭제하시겠습니까?\n등록된 PR과 검증 기록도 함께 보이지 않게 됩니다.`)) return;
    try {
      await prBatchApi.remove(batch.id);
      addToast('버전을 삭제했습니다', 'success');
      onDeleted();
    } catch {
      addToast('삭제에 실패했습니다', 'error');
    }
  };

  if (editing) {
    return (
      <div className="h-full overflow-y-auto bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700">
        <PrBatchForm initial={batch} onSaved={() => { setEditing(false); onChanged(); }} onCancel={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* 상단은 한두 줄로: 제목·상태·핵심 정보·버튼을 한 줄에, 보고서 기본값과 수정 내용은 작은 보조 줄에 둔다 */}
      <div className="shrink-0 border-b border-slate-200 px-5 pb-1.5 pt-2.5 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[17px] font-bold text-slate-800 dark:text-slate-100">{batch.sw_version}</span>
          {batch.verified_date
            ? <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">검증완료 {batch.verified_date}</span>
            : <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">검증 중</span>}
          <span className="flex flex-wrap gap-x-3 text-[11px] text-slate-400">
            <span>수정일자 <b className="font-medium text-slate-600 dark:text-slate-300">{batch.agreed_date}</b></span>
            {batch.previous_version && <span>이전 버전 <b className="font-medium text-slate-600 dark:text-slate-300">{batch.previous_version}</b></span>}
            <span>검증 보고 <b className="font-medium text-slate-600 dark:text-slate-300">{verifiedCount}/{batch.items.length}</b></span>
          </span>
          <span className="flex-1" />
          <div className="flex shrink-0 gap-1.5">
            <button onClick={() => setEditing(true)}
              className={`${BTN} border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800`}>
              버전 정보 수정
            </button>
            <button onClick={deleteBatch}
              className={`${BTN} border-slate-300 text-red-600 hover:bg-red-50 dark:border-slate-600 dark:text-red-400 dark:hover:bg-red-900/20`}>
              버전 삭제
            </button>
          </div>
        </div>
        {/* 보조 줄 하나: 수정 내용(없으면 보고서 기본값) 한 줄 요약. 전체 내용은 펼쳐서 본다 */}
        <div className="mt-0.5 text-[12px]">
          <div className="flex items-baseline gap-2">
            <span className="shrink-0 text-[11px] text-slate-400">{batch.summary ? '수정 내용' : '보고서 기본값'}</span>
            <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300" title={batch.summary ?? defaultsText}>
              {batch.summary ? batch.summary.split('\n')[0] : defaultsText}
            </span>
            <button type="button" onClick={() => setNotesOpen(v => !v)} aria-expanded={notesOpen}
              className="shrink-0 text-[11px] font-medium text-sky-700 hover:underline dark:text-sky-400">{notesOpen ? '접기' : '전체 보기'}</button>
          </div>
          {notesOpen && (
            <dl className="mt-1 grid max-h-40 gap-x-6 gap-y-2 overflow-y-auto rounded-lg bg-slate-50 px-3 py-2 @2xl:grid-cols-2 dark:bg-slate-800/60">
              {[['보고서 기본값 (검증 보고서에 자동으로 들어갑니다)', defaultsText], ['수정 내용', batch.summary], ['검증 방법', batch.notes]].map(([label, text]) => text && (
                <div key={label} className="min-w-0">
                  <dt className="mb-0.5 text-[11px] text-slate-400">{label}</dt>
                  <dd className="whitespace-pre-wrap break-words text-slate-600 dark:text-slate-300">{text}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
      <PrBatchTabs value={tab} onChange={setTab} itemCount={batch.items.length}
        verifiedCount={verifiedCount} documentCount={batch.attachments.length} />
      {stepEmpty && <PrBatchStepGuide tab={tab} />}

      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-1">
        {tab === 'items' && (
          <PrBatchItemTable batchId={batch.id} version={batch.sw_version} items={batch.items} onChanged={onChanged}
            verificationCount={id => batch.verifications.filter(v => v.item_id === id).length} />
        )}
        {tab === 'verifications' && <PrBatchVerificationPanel batch={batch} onChanged={onChanged} focusItemId={focusItemId} />}
        {tab === 'docs' && (
          <PrBatchDocuments batchId={batch.id} attachments={batch.attachments} onChanged={onChanged} />
        )}
      </div>
    </div>
  );
}
