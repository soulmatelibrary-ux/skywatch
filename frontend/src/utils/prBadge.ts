import type { PrBatchStatus } from '../types/prBatch';

// PR 버전 검증 화면 공통 배지 색. 진행 단계는 한 가지 색(sky)으로, 주의가 필요한 상태만 구분한다.
export const BATCH_STATUS_CLS: Record<PrBatchStatus, string> = {
  합의중: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  수정중: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  납품대기: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  검증중: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  완료: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  취소: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
};

export const JUDGMENT_CLS: Record<string, string> = {
  미판정: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  PASS: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  REJECT: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  보류: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  제외: 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
};

/** 브라우저 시간대 기준 오늘 (toISOString은 UTC라 00~09시에 전날이 된다) */
export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
