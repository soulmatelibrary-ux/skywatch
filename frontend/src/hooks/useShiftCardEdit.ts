import { useState } from 'react';
import { shiftLogApi } from '../services/api/shiftLogApi';
import { useUIStore } from '../store/uiStore';
import type { ShiftCardUpdateInput } from '../types/shiftLog';
import { notifyLogChange } from './useLogChannel';

export type EditResult = { ok: true } | { ok: false; status: number | undefined; message: string | null };

function failure(e: unknown): EditResult {
  const r = (e as { response?: { status?: number; data?: { detail?: unknown } } })?.response;
  return { ok: false, status: r?.status, message: typeof r?.data?.detail === 'string' ? r.data.detail : null };
}

/** 쓰기 화면 카드 수정·삭제. 성공하면 다른 창에 알리고 onChanged(목록 다시 불러오기)를 호출한다. 실패 문구는 호출한 쪽이 상자 안에 보여 준다. */
export function useShiftCardEdit(onChanged: () => void) {
  const addToast = useUIStore(s => s.addToast);
  const [busy, setBusy] = useState(false);

  async function run(task: () => Promise<unknown>, okMsg: string): Promise<EditResult> {
    setBusy(true);
    try {
      await task();
      addToast(okMsg, 'success');
      notifyLogChange();
      onChanged();
      return { ok: true };
    } catch (e) {
      return failure(e);
    } finally {
      setBusy(false);
    }
  }

  const update = (id: number, body: ShiftCardUpdateInput) =>
    run(() => shiftLogApi.updateCard(id, body), '카드를 수정했습니다.');
  const remove = (id: number) => run(() => shiftLogApi.deleteCard(id), '카드를 삭제했습니다.');
  return { busy, update, remove };
}
