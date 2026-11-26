import { useEffect, useState } from 'react';
import type { PrVerificationDetail } from '../../types/prBatch';
import { isRichEmpty } from '../../utils/prRichText';
import { RichContentView } from '../common/RichContentView';

interface Props {
  verificationId: number;
  loadDetail: (id: number) => Promise<PrVerificationDetail | null>;
}

const when = (value: string | null) => (value ? new Date(value).toLocaleString('ko-KR', { hour12: false }) : null);

// 검증·결과 탭에서 근무자 줄을 눌렀을 때 보이는 '시험 확인서' 내용 (시험방법·시험결과·비고).
export function PrVerificationReportView({ verificationId, loadDetail }: Props) {
  const [detail, setDetail] = useState<PrVerificationDetail | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    void loadDetail(verificationId).then(d => { if (alive) setDetail(d); });
    return () => { alive = false; };
  }, [verificationId, loadDetail]);

  if (detail === undefined) return <p className="px-3 py-2 text-[12px] text-slate-400">시험 확인서를 불러오는 중…</p>;
  if (detail === null) return <p className="px-3 py-2 text-[12px] text-red-500">시험 확인서를 불러오지 못했습니다.</p>;

  const info = [
    ['판정', detail.result], ['Skyline', detail.skyline_version], ['Adaptation', detail.adaptation_version], ['세그먼트', detail.test_segment],
    ['참석자', detail.attendees], ['시험일자', detail.tested_on], ['시작', when(detail.started_at)], ['종료', when(detail.ended_at)],
  ].filter(([, value]) => value);
  const sections = [['시험방법', detail.verify_method], ['시험결과', detail.result_summary], ['비고', detail.notes]]
    .filter(([, html]) => !isRichEmpty(html));

  return <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/40">
    {info.length > 0 && <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
      {info.map(([label, value]) => <span key={label}>{label} <b className="font-medium text-slate-700 dark:text-slate-200">{value}</b></span>)}
    </p>}
    {sections.length === 0 && <p className="text-[12px] text-slate-400">입력된 시험 내용이 없습니다.</p>}
    {sections.map(([label, html]) => <div key={label}>
      <p className="mb-0.5 text-[10px] font-medium text-slate-400">{label}</p>
      <RichContentView content={html as string} className="text-[12px] text-slate-700 dark:text-slate-200 break-words" />
    </div>)}
  </div>;
}
