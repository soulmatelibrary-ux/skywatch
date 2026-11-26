interface PopupGeometry {
  width: number;
  height: number;
  left: number;
  top: number;
}

export function popupFeatures(key: string, defaults: PopupGeometry): string {
  let g = defaults;
  try {
    const s = localStorage.getItem(key);
    if (s) {
      const parsed = JSON.parse(s) as PopupGeometry;
      if (parsed.width > 0 && parsed.height > 0) g = parsed;
    }
  } catch {}
  return `width=${g.width},height=${g.height},left=${g.left},top=${g.top},resizable=yes,scrollbars=yes`;
}

/**
 * 보기 창(일지·PR·문의) 크기·위치.
 * 새 화면: 화면 반쪽 크기로, 열 때마다 왼쪽 반 → 오른쪽 반을 번갈아 연다 (두 창을 나란히 놓고 비교하기 쉽게).
 * 기존 화면: 예전처럼 마지막 위치를 기억해 연다.
 */
export function readerFeatures(key: string, defaults: PopupGeometry): string {
  let v2 = false;
  let side = 0;
  try {
    v2 = localStorage.getItem('skywatch-ui') === 'v2';
    if (v2) {
      side = localStorage.getItem('reader-next-side') === '1' ? 1 : 0;
      localStorage.setItem('reader-next-side', side ? '0' : '1');
    }
  } catch { /* 저장소를 못 쓰면 왼쪽 반 */ }
  if (!v2) return popupFeatures(key, defaults);
  const s = screen as Screen & { availLeft?: number; availTop?: number };
  const half = Math.floor(s.availWidth / 2);
  // width·height 는 창 안쪽 크기라 테두리·주소줄 몫을 뺀다
  const width = half - 16;
  const height = s.availHeight - 80;
  const left = (s.availLeft ?? 0) + side * half;
  const top = s.availTop ?? 0;
  return `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
}

/** 보기 창 제목 — 작업표시줄·Alt+Tab 에서 창마다 구분되게 */
export function setWindowTitle(title: string) {
  document.title = title ? `${title} - SkyWatch` : 'SkyWatch';
}

export function installGeometrySaver(key: string): () => void {
  const save = () => {
    try {
      localStorage.setItem(key, JSON.stringify({
        width: window.outerWidth,
        height: window.outerHeight,
        left: window.screenLeft,
        top: window.screenTop,
      } satisfies PopupGeometry));
    } catch {}
  };
  window.addEventListener('beforeunload', save);
  window.addEventListener('resize', save);
  return () => {
    window.removeEventListener('beforeunload', save);
    window.removeEventListener('resize', save);
  };
}
