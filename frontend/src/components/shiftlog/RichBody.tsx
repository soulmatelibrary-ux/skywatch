import { useState } from 'react';
import DOMPurify from 'dompurify';
import { useContentLinks } from '../../hooks/useContentLinks';
import { injectLogLinks, injectTechDocLinks } from '../../utils/logLinkUtils';

const VIEW = 'sw-content text-[13px] leading-relaxed text-slate-700 dark:text-slate-200 [&_p]:my-0.5 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 '
  + '[&_table]:my-1.5 [&_table]:w-max [&_table]:min-w-full [&_table]:border-collapse [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-50 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold '
  + '[&_td]:border [&_td]:border-slate-200 [&_td]:px-2 [&_td]:py-1 [&_td]:align-top dark:[&_th]:border-slate-600 dark:[&_th]:bg-slate-800 dark:[&_td]:border-slate-700 [&_img]:my-1 [&_img]:max-h-80 [&_img]:max-w-full [&_img]:object-contain [&_img]:object-left [&_img]:rounded';

/** 표·이미지·링크가 있는 본문 — 기존 업무일지와 같은 HTML을 정화해서 그대로 보여준다. 넓은 표는 가로 스크롤.
 *  카드 링크·#TD:번호·#LOG:번호는 눌러서 바로 볼 수 있다. */
export function RichBody({ html, clamp = false }: { html: string; clamp?: boolean }) {
  const [open, setOpen] = useState(false);
  const links = useContentLinks();
  const folded = clamp && !open;
  return (
    <div onClick={e => e.stopPropagation()}>
      <div className={`relative overflow-x-auto ${folded ? 'max-h-[9.5em] overflow-y-hidden' : ''}`}>
        <div className={VIEW} onClick={links.onClick}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(injectTechDocLinks(injectLogLinks(html))) }} />
        {folded && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white dark:from-[#1e293b]" />}
      </div>
      {clamp && (
        <button type="button" onClick={() => setOpen(v => !v)} className="mt-0.5 text-[12px] font-bold text-blue-600 dark:text-blue-400">
          {open ? '접기 ▴' : '전체 보기 ▾'}
        </button>
      )}
      {links.overlay}
    </div>
  );
}
