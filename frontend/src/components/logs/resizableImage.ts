// 크기 조절 이미지 — TipTap 기본 노드뷰는 저장된 width/height 를 편집기 화면에 반영하지 않아 보강
import { Image } from '@tiptap/extension-image';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { NodeView } from '@tiptap/pm/view';

// 너비만 지정하고 높이는 비율대로 (편집기보다 넓으면 max-width 로 줄어들 때 찌그러지지 않게)
function applySize(img: HTMLImageElement | null, node: PMNode) {
  if (!img) return;
  const { width } = node.attrs as { width?: number | null };
  img.style.width = width ? `${width}px` : '';
  img.style.height = '';
}

export const ResizableImage = Image.extend({
  addNodeView() {
    const parent = this.parent?.();
    if (!parent) return null;
    return props => {
      const view = parent(props) as NodeView;
      const img = view.dom instanceof HTMLElement ? view.dom.querySelector('img') : null;
      applySize(img, props.node);
      const baseUpdate = view.update?.bind(view);
      view.update = (node, decorations, inner) => {
        const ok = baseUpdate ? baseUpdate(node, decorations, inner) : node.type === props.node.type;
        if (ok) applySize(img, node);
        return ok;
      };
      return view;
    };
  },
});
