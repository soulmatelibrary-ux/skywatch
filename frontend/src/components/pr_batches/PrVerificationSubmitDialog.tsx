import { useEffect, useState } from 'react';
import { PR_JUDGMENTS, type PrBatchItem, type PrReportDefaults, type PrVerification, type PrVerificationDetail, type PrVerificationSave } from '../../types/prBatch';
import { isRichEmpty, toEditorHtml } from '../../utils/prRichText';
import { PrRichEditor } from './PrRichEditor';

const pad = (n: number) => String(n).padStart(2, '0');
const toLocalInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const blankToNull = (v: string | null) => (v && v.trim() ? v : null);
const DEFAULT_SEGMENT = '시험평가시스템';

/** 버전 이름 + 버전에 적어 둔 보고서 기본값 */
export type ReportDefaults = PrReportDefaults & { sw_version: string };

interface Props {
  item: PrBatchItem;
  authorName: string;
  defaults: ReportDefaults;
  mineId?: number;
  lastMine?: PrVerification;
  saving: boolean;
  loadDetail: (id: number) => Promise<PrVerificationDetail | null>;
  onSave: (data: PrVerificationSave) => Promise<boolean>;
  onClose: () => void;
}

// 새 입력만 현재/+2시간을 기본값으로 쓴다. 기존 기록(엑셀 포함)에 없는 시간은 지어내지 않고 비워 둔다.
// 공통 정보: 저장된 기록 → 버전에 적어 둔 보고서 기본값 → 이 버전에서 내가 마지막에 쓴 값 → 고정 기본값
function buildForm(item: PrBatchItem, authorName: string, b: ReportDefaults, d?: PrVerificationDetail | null, last?: PrVerification): PrVerificationSave {
  const now = new Date();
  const local = (iso: string | null | undefined) => (iso ? toLocalInput(new Date(iso)) : null);
  return {
    result: d && PR_JUDGMENTS.includes(d.result) ? d.result : '미판정',
    skyline_version: d?.skyline_version ?? (b.skyline_version || last?.skyline_version || b.sw_version),
    adaptation_version: d?.adaptation_version ?? (b.adaptation_version || last?.adaptation_version || null),
    test_segment: d?.test_segment ?? (b.test_segment || last?.test_segment || DEFAULT_SEGMENT),
    attendees: d?.attendees ?? last?.attendees ?? authorName,
    tested_on: d ? d.tested_on : toLocalInput(now).slice(0, 10),
    started_at: d ? local(d.started_at) : toLocalInput(now),
    ended_at: d ? local(d.ended_at) : toLocalInput(new Date(now.getTime() + 2 * 3600 * 1000)),
    verify_method: toEditorHtml(d?.verify_method ?? item.verify_method),
    result_summary: toEditorHtml(d?.result_summary), notes: d?.notes ?? null,
  };
}

export function PrVerificationSubmitDialog({ item, authorName, defaults, mineId, lastMine, saving, loadDetail, onSave, onClose }: Props) {
  const [form, setForm] = useState<PrVerificationSave>(() => buildForm(item, authorName, defaults, null, lastMine));
  const [showCommon, setShowCommon] = useState(false);
  const [loading, setLoading] = useState(!!mineId);
  const [error, setError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!mineId) return;
    let alive = true;
    void loadDetail(mineId).then(detail => {
      if (!alive) return;
      // 기존 기록을 못 불러온 채 저장하면 새 입력 기본값으로 덮어쓰게 되므로 저장을 막는다.
      if (detail) setForm(buildForm(item, authorName, defaults, detail, lastMine));
      else setError('기존 검증 내용을 불러오지 못했습니다. 창을 닫고 다시 열어 주세요.');
      setLoadFailed(!detail);
      setLoading(false);
    });
    return () => { alive = false; };
  // 열릴 때 한 번만 기존 기록을 불러온다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mineId]);

  const [dirty, setDirty] = useState(false);
  const update = (patch: Partial<PrVerificationSave>) => { setDirty(true); setForm(f => ({ ...f, ...patch })); };
  const set = (key: keyof PrVerificationSave) => (e: { target: { value: string } }) => update({ [key]: e.target.value });
  // 바깥 클릭으로는 닫지 않는다(드래그로 붙여넣은 표·이미지 유실 방지). Esc는 작성 중이면 확인 후 닫는다.
  // 저장(PDF 생성) 중에는 닫지 않는다. 닫은 뒤 다른 PR 창을 열면 앞 저장 완료가 그 창을 닫아 버린다.
  const close = () => { if (saving) return; if (!dirty || confirm('작성 중인 내용이 저장되지 않습니다. 닫을까요?')) onClose(); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const input = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-[12px] text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';
  const label = 'text-[11px] text-slate-500';

  const submit = async () => {
    if (isRichEmpty(form.verify_method) || isRichEmpty(form.result_summary)) { setError('시험방법과 시험결과를 입력해 주세요.'); return; }
    const data = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, k === 'result' ? v : blankToNull(v)])) as unknown as PrVerificationSave;
    if (await onSave(data)) onClose();
  };

  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4">
    <div role="dialog" aria-modal="true" className="flex max-h-[94vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
      <div className="border-b border-slate-200 px-5 py-3 dark:border-slate-700">
        <h3 className="font-bold text-slate-800 dark:text-slate-100">{item.kac_pr_no || item.lm_pr_no} 검증 결과 {mineId ? '수정' : '입력'}</h3>
        <p className="mt-0.5 text-[12px] text-slate-500">{item.title}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">작성자 {authorName}. 작성자·PR번호·시험명은 자동으로 들어갑니다. 표와 스크린샷은 Ctrl+V로 붙여넣으세요.</p>
      </div>
      {loading ? <p className="py-16 text-center text-[12px] text-slate-400">기존 검증 내용을 불러오는 중…</p> :
      <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-5 sm:grid-cols-4">
        {/* 보고서 공통 정보 — 버전 기본값으로 채워져 있어 평소엔 접어 둔다 */}
        <div className="col-span-full flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <span className="text-[11px] text-slate-400">보고서 공통 정보</span>
          <span>Skyline <b>{form.skyline_version || '-'}</b></span>
          <span>Adaptation <b className={form.adaptation_version ? '' : 'text-amber-600'}>{form.adaptation_version || '미입력'}</b></span>
          <span>세그먼트 <b>{form.test_segment || '-'}</b></span>
          <span>참석자 <b>{form.attendees || '-'}</b></span>
          <button type="button" onClick={() => setShowCommon(v => !v)} className="ml-auto text-[12px] font-medium text-sky-600 hover:underline dark:text-sky-400">
            {showCommon ? '접기' : '바꾸기'}</button>
        </div>
        {showCommon && <>
          <label className={label}>Skyline 버전<input className={input} value={form.skyline_version ?? ''} onChange={set('skyline_version')} /></label>
          <label className={label}>Adaptation 버전<input className={input} value={form.adaptation_version ?? ''} onChange={set('adaptation_version')} /></label>
          <label className={label}>시험 세그먼트<input className={input} value={form.test_segment ?? ''} onChange={set('test_segment')} /></label>
          <label className={label}>시험 참석자<input className={input} value={form.attendees ?? ''} onChange={set('attendees')} /></label>
        </>}
        <label className={label}>시험일자<input type="date" className={input} value={form.tested_on ?? ''} onChange={set('tested_on')} /></label>
        <label className={label}>시험 시작<input type="datetime-local" className={input} value={form.started_at ?? ''} onChange={set('started_at')} /></label>
        <label className={label}>시험 종료<input type="datetime-local" className={input} value={form.ended_at ?? ''} onChange={set('ended_at')} /></label>
        <div className={`${label} col-span-full`}>시험방법
          <PrRichEditor initialHtml={form.verify_method ?? ''} onChange={html => update({ verify_method: html })} placeholder="시험 절차를 입력하거나 표·이미지를 붙여넣으세요" minHeight={160} />
        </div>
        <div className={`${label} col-span-full`}>시험결과
          <PrRichEditor initialHtml={form.result_summary ?? ''} onChange={html => update({ result_summary: html })} placeholder="수정 전과 수정 후 결과를 입력하세요" minHeight={110} />
        </div>
        <label className={`${label} col-span-full`}>비고<textarea rows={2} className={input} value={form.notes ?? ''} onChange={set('notes')} /></label>
      </div>}
      <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-700">
        {error && <span className="mr-auto text-[12px] text-red-500">{error}</span>}
        <button onClick={close} disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2 text-[12px] text-slate-500 disabled:opacity-50 dark:border-slate-600">취소</button>
        <button onClick={() => void submit()} disabled={saving || loading || loadFailed} className="rounded-lg bg-sky-600 px-4 py-2 text-[12px] text-white disabled:opacity-50">
          {saving ? '보고서 만드는 중…' : '저장하고 보고서 만들기'}</button>
      </div>
    </div>
  </div>;
}
