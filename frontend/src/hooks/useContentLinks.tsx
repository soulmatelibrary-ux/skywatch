import { useCallback, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CardPreviewModal } from '../components/logs/CardPreviewModal';
import { TechDocPreviewModal } from '../components/tech_docs/TechDocPreviewModal';
import { openLogPopup } from '../utils/openLogPopup';

const LINK_SELECTOR = 'a[href], .sw-link[data-card-id], .sw-log-link[data-log-id], .sw-td-link[data-techdoc-id]';

/** 본문 보기 안의 링크 클릭 처리 — 카드 링크는 카드 미리보기, #TD:번호는 문서 미리보기, #LOG:번호는 일지 창.
 *  예전에 개발 PC 주소(http://localhost...)로 저장된 카드 링크도 주소 끝의 #card-번호로 같은 방식으로 연다. */
export function useContentLinks(): { onClick: (e: MouseEvent<HTMLElement>) => void; overlay: ReactNode } {
  const [cardId, setCardId] = useState<number | null>(null);
  const [docId, setDocId] = useState<number | null>(null);

  const onClick = useCallback((e: MouseEvent<HTMLElement>) => {
    const a = (e.target as HTMLElement).closest(LINK_SELECTOR);
    if (!a) return;
    e.preventDefault();
    const href = a.getAttribute('href') ?? '';
    const num = (v: string | null | undefined) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null; };

    const td = num(a.getAttribute('data-techdoc-id'));
    if (td) { setDocId(td); return; }
    // 카드 링크는 data-log-id 도 함께 가지므로 카드를 먼저 본다
    const card = num(a.getAttribute('data-card-id') ?? href.match(/#card-(\d+)$/)?.[1]);
    if (card) { setCardId(card); return; }
    const log = num(a.getAttribute('data-log-id') ?? href.match(/#log-(\d+)$/)?.[1]);
    if (log) { openLogPopup(log); return; }
    if (href && !href.startsWith('#') && a instanceof HTMLAnchorElement) window.open(a.href, '_blank', 'noopener');
  }, []);

  // 과제 창·팝업 위에서 열어도 가려지지 않게 맨 위 층에 띄운다
  const overlay = (cardId !== null || docId !== null) && createPortal(
    <div className="relative z-[450]" onClick={e => e.stopPropagation()}>
      {cardId !== null && <CardPreviewModal cardId={cardId} onClose={() => setCardId(null)} />}
      {docId !== null && <TechDocPreviewModal docId={docId} onClose={() => setDocId(null)} />}
    </div>,
    document.body,
  );
  return { onClick, overlay };
}
