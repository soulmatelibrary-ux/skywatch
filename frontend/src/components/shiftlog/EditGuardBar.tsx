import { BTN, BTN_DANGER } from './CardEditNotices';

/** 수정 중인 카드가 있는데 다른 곳으로 이동하려 할 때 나오는 고정 띠 */
export function EditGuardBar({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  return (
    <div role="alert" className="sticky top-0 z-30 mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border-l-4 border-amber-500 bg-amber-100 px-3 py-2 text-[13px] font-semibold text-amber-900 shadow-sm dark:bg-amber-900/60 dark:text-amber-50">
      <span className="flex-1">수정 중인 카드가 있습니다. 저장하지 않고 이동할까요?</span>
      <button type="button" autoFocus className={BTN} onClick={onStay}>계속 수정</button>
      <button type="button" className={BTN_DANGER} onClick={onLeave}>버리고 이동</button>
    </div>
  );
}
