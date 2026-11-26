import { useState } from 'react';
import { createPortal } from 'react-dom';
import { LinkChainModal } from './LinkChainModal';
import { CardPreviewModal } from './CardPreviewModal';

interface Props {
  cardId: number;
  cardTitle: string;
  onClose: () => void;
}

type Mode = 'choose' | 'chain' | 'single';

export function LinkViewDialog({ cardId, cardTitle, onClose }: Props) {
  const [mode, setMode] = useState<Mode>(() => {
    const saved = localStorage.getItem('sw-link-view');
    if (saved === 'choose') return 'choose';
    if (saved === 'chain') return 'chain';
    if (saved === 'single') return 'single';
    return 'single';
  });

  function pick(m: 'chain' | 'single') {
    localStorage.setItem('sw-link-view', m);
    setMode(m);
  }

  return createPortal(
    <>
      {mode === 'chain' && <LinkChainModal cardId={cardId} cardTitle={cardTitle} onClose={onClose} />}
      {mode === 'single' && <CardPreviewModal cardId={cardId} onClose={onClose} />}
      {mode === 'choose' && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4"
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-3 border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
            <div className="text-[15px] font-bold text-slate-800 dark:text-slate-100">링크된 카드 보기</div>
            <div className="text-[13px] text-slate-600 truncate dark:text-slate-300">{cardTitle}</div>
            <div className="flex gap-2">
              <button
                onClick={() => pick('chain')}
                className="flex-1 py-2 text-[13px] rounded-lg border border-slate-200 hover:bg-slate-50 transition dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                연결 체인 전체 보기
              </button>
              <button
                onClick={() => pick('single')}
                className="flex-1 py-2 text-[13px] rounded-lg border border-blue-300 bg-blue-50 text-blue-700 transition dark:border-cyan-500 dark:bg-cyan-500/15 dark:text-cyan-200"
              >
                현재 카드만 보기
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
