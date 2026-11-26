// 본문 보기 — 편집기 HTML(표·이미지)은 정화해서 그대로, 예전 평문은 줄바꿈 유지
import type { MouseEvent } from 'react';
import DOMPurify from 'dompurify';
import { useContentLinks } from '../../hooks/useContentLinks';
import { injectLogLinks, injectTechDocLinks } from '../../utils/logLinkUtils';

interface Props {
  content: string;
  className?: string;
  /** 정화 전에 HTML을 바꿀 때 (기본: #TD:번호·#LOG:번호를 링크로) */
  transform?: (html: string) => string;
  /** 먼저 처리할 클릭 — preventDefault 하지 않으면 카드·문서·일지 링크 기본 처리로 넘어간다 */
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
}

const defaultTransform = (html: string) => injectTechDocLinks(injectLogLinks(html));

export function RichContentView({ content, className = '', transform = defaultTransform, onClick }: Props) {
  const links = useContentLinks();
  if (!content.trim().startsWith('<')) {
    return <div className={`whitespace-pre-wrap ${className}`}>{content}</div>;
  }
  const html = DOMPurify.sanitize(transform(content));
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    onClick?.(e);
    if (!e.defaultPrevented) links.onClick(e);
  };
  return (
    <>
      <div className={`sw-content overflow-x-auto ${className}`} onClick={handleClick} dangerouslySetInnerHTML={{ __html: html }} />
      {links.overlay}
    </>
  );
}
