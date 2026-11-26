import { useState } from 'react';
import { attachmentApi } from '../services/api/attachmentApi';
import { shiftLogApi } from '../services/api/shiftLogApi';
import { workThreadApi } from '../services/api/workThreadApi';
import { useUIStore } from '../store/uiStore';
import type { MemoInput, ShiftCardInput, ShiftType } from '../types/shiftLog';
import { notifyLogChange } from './useLogChannel';

function errorText(e: unknown, fallback: string): string {
  const detail = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === 'string' ? detail : fallback;
}

/** 일지 쓰기 동작 — 카드·메모 추가, 메모 확인, 근무자 저장. 성공하면 onChanged 호출. */
export function useShiftActions(onChanged: () => void) {
  const addToast = useUIStore(s => s.addToast);
  const [busy, setBusy] = useState(false);

  async function run(task: () => Promise<unknown>, okMsg: string, failMsg: string): Promise<boolean> {
    setBusy(true);
    try {
      await task();
      addToast(okMsg, 'success');
      notifyLogChange();   // 열려 있는 기존 업무일지 화면에도 알림
      onChanged();
      return true;
    } catch (e) {
      addToast(errorText(e, failMsg), 'error');
      return false;
    } finally {
      setBusy(false);
    }
  }

  /** 카드(메모)를 만든 뒤 첨부를 차례로 올린다. 실패한 파일은 이름을 알려주고 카드는 그대로 둔다. */
  async function uploadAll(cardId: number | undefined, files: File[]) {
    if (!cardId || !files.length) return;
    const failed: string[] = [];
    for (const f of files) {
      try { await attachmentApi.upload('card', cardId, f); } catch { failed.push(f.name); }
    }
    if (failed.length) addToast(`첨부 ${failed.length}개를 올리지 못했습니다: ${failed.join(', ')}`, 'warning');
  }

  const addCard = (body: ShiftCardInput, isPast: boolean, files: File[] = []) => run(
    async () => {
      const card = (await shiftLogApi.addCard(body)).data.data;
      const nos = card?.inquiry_nos ?? [];
      if (nos.length) addToast(`문의사항 메뉴에도 등록했습니다 (${nos.join(', ')})`, 'info');
      await uploadAll(card?.id, files);
    },
    isPast ? '지난 근무에 카드를 추가했습니다. 지연 작성으로 표시됩니다.' : '카드를 추가했습니다.',
    '카드를 저장하지 못했습니다.',
  );

  const addMemo = (body: MemoInput, files: File[] = []) => run(
    async () => uploadAll((await shiftLogApi.addMemo(body)).data.data?.id, files),
    '전달을 남겼습니다.', '전달을 저장하지 못했습니다.',
  );

  const checkMemo = (cardId: number) => run(
    () => shiftLogApi.checkMemo(cardId), '확인했습니다.', '확인 처리하지 못했습니다.',
  );

  const saveWorkers = (date: string, shift: ShiftType, userIds: number[]) => run(
    () => shiftLogApi.setParticipants(date, shift, userIds), '근무자를 저장했습니다.', '근무자를 저장하지 못했습니다.',
  );

  const closeThread = (threadId: number) => run(
    () => workThreadApi.update(threadId, { status: 'done' }), '종료했습니다.', '종료하지 못했습니다.',
  );

  return { busy, addCard, addMemo, checkMemo, saveWorkers, closeThread };
}
