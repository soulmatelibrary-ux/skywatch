import { readerFeatures } from './popupGeometry';

/** 기존 업무일지 보기 창을 연다. cardId가 있으면 그 카드로 내려가 강조한다. */
export function openLogPopup(logId: number, cardId?: number | null) {
  const features = readerFeatures('popup_log_view', {
    width: 1240, height: 860,
    left: Math.round((screen.width - 1240) / 2), top: Math.round((screen.height - 860) / 2),
  });
  const hash = cardId ? `#card-${cardId}` : '';
  window.open(`/logs/view-popup?id=${logId}${hash}`, `log_view_${logId}`, features);
}

/** 새 업무일지 작성 창 (업무일지 조회 화면의 "+ 새 일지 작성") */
export function openLogCreatePopup() {
  const w = 1240, h = 860;
  const left = Math.round((screen.width - w) / 2);
  const top = Math.round((screen.height - h) / 2);
  window.open('/logs/create-popup', 'log_create', `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
}
