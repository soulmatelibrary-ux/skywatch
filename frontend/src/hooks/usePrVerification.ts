import { useCallback, useState } from 'react';
import { prBatchApi } from '../services/api/prBatchApi';
import { useUIStore } from '../store/uiStore';
import type { PrVerificationSave } from '../types/prBatch';

function errorMessage(err: unknown, fallback: string) {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
}

export function usePrVerification(batchId: number, onChanged: () => void) {
  const addToast = useUIStore(s => s.addToast);
  const [working, setWorking] = useState(false);

  const run = useCallback(async (task: () => Promise<string | [string, 'success' | 'warning']>, fallback: string) => {
    setWorking(true);
    try {
      const out = await task();
      const [message, type] = Array.isArray(out) ? out : [out, 'success' as const];
      addToast(message, type);
      onChanged();
      return true;
    } catch (err) {
      addToast(errorMessage(err, fallback), 'error');
      return false;
    } finally {
      setWorking(false);
    }
  }, [addToast, onChanged]);

  const save = (itemId: number, data: PrVerificationSave) => run(async () => {
    await prBatchApi.saveVerification(itemId, data);
    return '검증 결과를 저장하고 보고서를 만들었습니다';
  }, '저장에 실패했습니다');

  const remove = (verificationId: number) => run(async () => {
    await prBatchApi.deleteVerification(verificationId);
    return '검증 기록과 보고서를 삭제했습니다';
  }, '삭제에 실패했습니다');

  const uploadWorkbook = (file: File) => run(async () => {
    const { data } = await prBatchApi.importWorkbook(batchId, file);
    // 서버 메시지에 건너뛴 시트(배치에 없는 PR)·중복 시트가 함께 들어 있다.
    const skipped = (data.data?.skipped_sheets?.length ?? 0) + (data.data?.duplicate_sheets?.length ?? 0);
    return [data.message || `엑셀 PR 시트 ${data.data?.imported_items ?? 0}건을 반영했습니다`, skipped ? 'warning' : 'success'];
  }, '엑셀을 읽지 못했습니다');

  const loadDetail = useCallback(async (verificationId: number) => {
    try {
      return (await prBatchApi.getVerification(verificationId)).data.data ?? null;
    } catch (err) {
      addToast(errorMessage(err, '검증 내용을 불러오지 못했습니다'), 'error');
      return null;
    }
  }, [addToast]);

  return { working, save, remove, uploadWorkbook, loadDetail };
}
