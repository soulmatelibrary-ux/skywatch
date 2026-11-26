import DOMPurify from 'dompurify';
import { useEffect, useRef } from 'react';
import { injectLogLinks, injectTechDocLinks } from '../../utils/logLinkUtils';

interface Props {
  html: string;
  onLinkClick?: (cardId: number) => void;
}

export function CardContentView({ html, onLinkClick }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href], .sw-link[data-card-id]') as HTMLElement | null;
      if (!link) return;

      const cardIdAttr = link.getAttribute('data-card-id');
      const hrefAttr = link.getAttribute('href') ?? '';
      const cardMatch = hrefAttr.match(/#card-(\d+)$/);

      if (cardIdAttr || cardMatch || hrefAttr === '#internal') {
        e.preventDefault();
        const nextCardId = cardIdAttr ? Number(cardIdAttr) : Number(cardMatch?.[1]);
        if (onLinkClick && Number.isFinite(nextCardId) && nextCardId > 0) {
          onLinkClick(nextCardId);
        }
        return;
      }

      if (hrefAttr.startsWith('#')) {
        e.preventDefault();
        return;
      }

      if (link instanceof HTMLAnchorElement && /^https?:/i.test(link.href)) {
        e.preventDefault();
        const w = 1200, h = 800;
        const left = Math.round((screen.width - w) / 2);
        const top = Math.round((screen.height - h) / 2);
        window.open(link.href, `ext_${Date.now()}`, `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
      }
    };

    root.addEventListener('click', handleClick);
    return () => root.removeEventListener('click', handleClick);
  }, [onLinkClick]);

  return (
    <div
      ref={contentRef}
      className="tiptap-view sw-content w-full px-5 py-4 text-[16px] [&_strong]:font-bold [&_em]:italic [&_u]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_h1]:text-[24px] [&_h1]:font-bold [&_h1]:my-3 [&_h2]:text-[20px] [&_h2]:font-bold [&_h2]:my-3 [&_h3]:text-[17px] [&_h3]:font-semibold [&_h3]:my-2 [&_hr]:border-slate-300 [&_hr]:my-3 [&_p]:mb-1.5 [&_a]:cursor-pointer [&_a]:underline [&_a]:text-blue-600 [&_.sw-link]:px-2 [&_.sw-link]:py-0.5 [&_.sw-link]:bg-blue-100 [&_.sw-link]:text-blue-700 [&_.sw-link]:border [&_.sw-link]:border-blue-300 [&_.sw-link]:rounded [&_.sw-log-link]:px-2 [&_.sw-log-link]:py-0.5 [&_.sw-log-link]:bg-violet-100 [&_.sw-log-link]:text-violet-700 [&_.sw-log-link]:border [&_.sw-log-link]:border-violet-300 [&_.sw-log-link]:rounded [&_.sw-log-link]:cursor-pointer [&_.sw-td-link]:px-2 [&_.sw-td-link]:py-0.5 [&_.sw-td-link]:bg-blue-100 [&_.sw-td-link]:text-blue-700 [&_.sw-td-link]:border [&_.sw-td-link]:border-blue-300 [&_.sw-td-link]:rounded [&_.sw-td-link]:cursor-pointer"
      style={{ lineHeight: '1.9' }}
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(injectTechDocLinks(injectLogLinks(html))) }}
    />
  );
}
