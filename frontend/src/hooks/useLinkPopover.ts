import { useCallback, useState } from 'react';
import type { Editor } from '@tiptap/core';

export interface LinkPopoverState {
  x: number;
  y: number;
  cardId: string;
  text: string;
}

export function useLinkPopover(editor: Editor | null) {
  const [popover, setPopover] = useState<LinkPopoverState | null>(null);

  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('a.sw-link');
    if (!target) return;
    e.preventDefault();
    const cardId = target.getAttribute('data-card-id') ?? '';
    const text = target.textContent ?? '';
    setPopover({ x: e.clientX, y: e.clientY, cardId, text });
  }, []);

  const dismissPopover = useCallback(() => setPopover(null), []);

  const deleteLink = useCallback(() => {
    if (!editor || !popover) return;
    const html = editor.getHTML();
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const links = parsed.querySelectorAll(`a[data-card-id="${popover.cardId}"]`);
    for (const link of links) {
      if (link.textContent === popover.text) {
        link.replaceWith(document.createTextNode(link.textContent ?? ''));
        break;
      }
    }
    editor.commands.setContent(parsed.body.innerHTML);
    setPopover(null);
  }, [editor, popover]);

  return { popover, handleEditorClick, dismissPopover, deleteLink };
}
