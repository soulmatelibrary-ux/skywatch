import { useState } from 'react';
import { prBatchApi } from '../../services/api/prBatchApi';
import type { PrBatchItem, PrVerification, PrVerificationDetail } from '../../types/prBatch';
import { JUDGMENT_CLS } from '../../utils/prBadge';
import { PrVerificationReportView } from './PrVerificationReportView';

interface Props {
  item: PrBatchItem;
  rows: PrVerification[];
  meId: number | undefined;
  isAdmin: boolean;
  checked: boolean;
  onCheck: () => void;
  onEdit: () => void;
  onDelete: (v: PrVerification) => void;
  loadDetail: (id: number) => Promise<PrVerificationDetail | null>;
}

export function PrVerificationItem({ item, rows, meId, isAdmin, checked, onCheck, onEdit, onDelete, loadDetail }: Props) {
  const [openId, setOpenId] = useState<number | null>(null);  // 시험 확인서 내용을 펼친 검증 기록
  const hasMine = rows.some(v => v.user_id === meId);
  // 왼쪽 색 띠: 검증한 사람이 있으면 초록, 아직 없으면 회색
  return <section className={`overflow-hidden rounded-xl border border-l-4 border-slate-200 dark:border-slate-700 ${rows.length ? 'border-l-emerald-500 dark:border-l-emerald-500' : 'border-l-slate-300 dark:border-l-slate-600'}`}>
    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 dark:bg-slate-800">
      <input type="checkbox" checked={checked} onChange={onCheck} title="일괄 다운로드에 포함" aria-label="보고서 묶음에 포함" />
      <span className="shrink-0 font-mono text-[11px] font-bold text-sky-700 dark:text-sky-400">{item.kac_pr_no || item.lm_pr_no || item.item_kind}</span>
      <span className="min-w-0 flex-1 truncate text-[12px] text-slate-700 dark:text-slate-200" title={item.title}>{item.title}</span>
      <span className={`shrink-0 text-[11px] ${rows.length ? 'font-medium text-emerald-700 dark:text-emerald-400' : 'text-slate-400'}`}>
        {rows.length ? `${rows.length}명 검증` : '검증 전'}</span>
      <button onClick={onEdit} className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] ${hasMine
        ? 'border border-slate-300 text-slate-600 hover:bg-white dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
        : 'bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400'}`}>
        {hasMine ? '내 검증 수정' : '내 검증 입력'}</button>
    </div>
    {rows.length === 0
      ? <p className="px-3 py-2 text-[12px] text-slate-400">아직 검증한 사람이 없습니다. [내 검증 입력]으로 첫 결과를 남겨 주세요.</p>
      : rows.map(v => {
        const deletable = v.user_id === meId || isAdmin;
        const open = openId === v.id;
        return <div key={v.id} className="border-t border-slate-100 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-[12px]">
          <button type="button" onClick={() => setOpenId(open ? null : v.id)} aria-expanded={open} title="시험 확인서 내용 보기"
            className="min-w-16 text-left font-medium text-slate-700 hover:text-sky-700 dark:text-slate-200 dark:hover:text-sky-400">
            <span className="mr-1 text-[10px] text-slate-400">{open ? '▾' : '▸'}</span>{v.user_name}</button>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${JUDGMENT_CLS[v.result] ?? JUDGMENT_CLS['미판정']}`}>
            {v.result}</span>
          {v.tested_on && <span className="text-[11px] text-slate-400">{v.tested_on}</span>}
          {v.source_import_id && <span className="rounded bg-slate-100 px-1.5 text-[10px] text-slate-500 dark:bg-slate-700 dark:text-slate-300" title="엑셀 업로드로 입력">엑셀</span>}
          <span className="flex-1" />
          {v.report_original_name && <>
            <a href={prBatchApi.verificationReportUrl(v.id)} target="_blank" rel="noreferrer" className="text-sky-700 hover:underline dark:text-sky-400">보고서 보기</a>
            <a href={prBatchApi.verificationReportUrl(v.id, true)} className="rounded-lg border border-slate-300 px-2 py-0.5 text-[11px] text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800">PDF 받기</a>
          </>}
          {deletable && <button onClick={() => { if (confirm(`${v.user_name}의 검증 기록과 보고서를 삭제하시겠습니까?`)) onDelete(v); }}
            className="rounded-lg border border-rose-300 px-2 py-0.5 text-[11px] text-rose-600 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-950">삭제</button>}
        </div>
        {open && <PrVerificationReportView key={`${v.id}:${v.submitted_at ?? ''}`} verificationId={v.id} loadDetail={loadDetail} />}
        </div>;
      })}
  </section>;
}
