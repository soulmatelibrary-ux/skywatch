// @사용자명을 하이라이트하는 유틸리티
import React from 'react';

export function highlightMentions(
  text: string | null | undefined,
  className?: string
): React.ReactNode {
  if (!text) return null;

  const defaultClassName = className || "bg-yellow-200 text-yellow-900 px-1.5 py-0.5 rounded font-medium";

  const parts = text.split(/(@[a-zA-Z0-9_-]+)/);
  return (
    <>
      {parts.map((part, i) => {
        if (part && part.startsWith('@')) {
          return (
            <span
              key={i}
              className={defaultClassName}
            >
              {part}
            </span>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

export function wrapMentionsInHTML(html: string | null | undefined): string {
  if (!html) return '';
  // HTML 콘텐츠에서 @멘션을 <span> 태그로 감싸기
  return html.replace(/(@[a-zA-Z0-9_-]+)/g, '<span class="bg-yellow-200 text-yellow-900 px-1.5 py-0.5 rounded font-medium">$1</span>');
}
