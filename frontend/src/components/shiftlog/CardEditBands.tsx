import { Band, BTN } from './CardEditNotices';

interface Props {
  writer: string;
  gone: boolean;      // 다른 곳에서 삭제됨
  stale: boolean;     // 카드를 다시 불러오지 못함 (삭제된 것이 아니다)
  ask: boolean;       // 남의 카드 저장 전 확인
  conflict: string | null;
  err: string | null;
  onClose: () => void;
  onAskStay: () => void;
  onAskSave: () => void;
  onConflictStay: () => void;
  onOverwrite: () => void;
}

/** 수정 상자 안 안내 띠 — 삭제됨·불러오기 실패·남의 카드 확인·충돌·저장 실패 */
export function CardEditBands({ writer, gone, stale, ask, conflict, err, onClose, onAskStay, onAskSave, onConflictStay, onOverwrite }: Props) {
  return (
    <>
      {gone && (
        <Band tone="red" actions={<button type="button" className={BTN} onClick={onClose}>닫기</button>}>
          이 카드는 다른 곳에서 삭제되어 저장할 수 없습니다. 필요한 내용을 복사한 뒤 닫아 주세요.
        </Band>
      )}
      {stale && !gone && <Band tone="info">카드 목록을 불러오지 못했습니다. 입력한 내용은 그대로 있습니다.</Band>}
      {ask && (
        <Band tone="amber" actions={<>
          <button type="button" autoFocus className={BTN} onClick={onAskStay}>계속 수정</button>
          <button type="button" className={BTN} onClick={onAskSave}>{writer} 님 카드 저장</button>
        </>}>{writer} 님이 쓴 카드입니다. 고쳐 저장하면 이전 내용은 남지 않고, 이 근무 일지를 만든 사람에게 수정 알림이 갑니다(그 사람이 직접 고치면 알림은 없습니다).</Band>
      )}
      {conflict && (
        <Band tone="amber" actions={<>
          <button type="button" autoFocus className={BTN} onClick={onConflictStay}>계속 수정</button>
          <button type="button" className={BTN} onClick={onOverwrite}>내 내용으로 저장</button>
        </>}>{conflict} 바뀐 내용을 확인했다면 ‘내 내용으로 저장’으로 덮어쓸 수 있습니다. 덮어쓰면 그 사이 바뀐 내용은 남지 않습니다.</Band>
      )}
      {err && <Band tone="red">{err}</Band>}
    </>
  );
}
