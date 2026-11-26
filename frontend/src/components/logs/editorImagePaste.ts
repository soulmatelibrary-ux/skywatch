import { DOMParser as PMDOMParser } from '@tiptap/pm/model';

type ImagePasteCallbacks = {
  onStart?: () => void;
  onFinish?: () => void;
};

function cleanOfficeHtml(html: string): string {
  let s = html;
  // Remove Word conditional comments <!--[if ...]>...</[endif]-->
  s = s.replace(/<!--\[if[^\]]*\]>[\s\S]*?<!\[endif\]-->/gi, '');
  // Remove all HTML comments
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  // Remove XML/Office namespace tags (o:p, w:sdtContent, x:str, etc.)
  s = s.replace(/<\/?[a-z]+:[^\s>]*[^>]*>/gi, '');
  // Remove mso-* properties from inline styles
  s = s.replace(/\s*mso-[a-z-]+\s*:[^;}"']+;?\s*/gi, '');
  // Remove empty style attributes left over
  s = s.replace(/\s+style="\s*"/gi, '');
  // Remove Word class attributes
  s = s.replace(/\s+class="[^"]*"/gi, '');
  // Remove lang attributes
  s = s.replace(/\s+lang="[^"]*"/gi, '');
  // Remove data-* attributes (HWP/Office artifacts)
  s = s.replace(/\s+data-[a-z-]+="[^"]*"/gi, '');
  // Remove width/height on table cells (let TipTap handle sizing)
  s = s.replace(/\s+(width|height)="[^"]*"/gi, '');
  // Remove colspan/rowspan that break ProseMirror schema
  s = s.replace(/\s+(colspan|rowspan)="[^"]*"/gi, '');
  // Extract body content if it's a full HTML document
  const bodyMatch = s.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) s = bodyMatch[1];
  return s.trim();
}

/** Normalize table structure for ProseMirror compatibility. */
function normalizeTable(table: HTMLTableElement): void {
  // Ensure consistent column count across all rows
  const rows = table.querySelectorAll('tr');
  let maxCols = 0;
  rows.forEach(row => {
    const cells = row.querySelectorAll('td, th');
    if (cells.length > maxCols) maxCols = cells.length;
  });
  rows.forEach(row => {
    const cells = row.querySelectorAll('td, th');
    const diff = maxCols - cells.length;
    for (let i = 0; i < diff; i++) {
      const isHeader = row.closest('thead') !== null;
      row.appendChild(document.createElement(isHeader ? 'th' : 'td'));
    }
  });
  // Convert first row to th if it's in thead or all cells are bold
  const firstRow = rows[0];
  if (firstRow) {
    const cells = firstRow.querySelectorAll('td');
    if (cells.length > 0) {
      const allBold = Array.from(cells).every(
        td => td.querySelector('b, strong') !== null || (td.style?.fontWeight && parseInt(td.style.fontWeight) >= 700),
      );
      if (allBold || firstRow.closest('thead')) {
        cells.forEach(td => {
          const th = document.createElement('th');
          th.innerHTML = td.innerHTML;
          td.replaceWith(th);
        });
      }
    }
  }
}

export function handleTablePaste(view: any, event: ClipboardEvent): boolean {
  const data = event.clipboardData;
  if (!data) return false;

  const html = data.getData('text/html');
  if (!html || !/<table/i.test(html)) return false;

  const cleaned = cleanOfficeHtml(html);
  const wrapper = document.createElement('div');
  wrapper.innerHTML = cleaned;

  const tables = Array.from(wrapper.querySelectorAll('table'));
  if (!tables.length) return false;

  try {
    // 표만 남기면 Word/HWP에서 함께 복사한 앞뒤 문단이 사라지므로, 모든 표를 정리한 뒤 전체 내용을 넣는다.
    tables.forEach(normalizeTable);
    // Word/HWP가 함께 넣는 로컬 파일 이미지(file:///...clip_image001.png)는 열 수 없으므로 뺀다.
    wrapper.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src') ?? '';
      if (!src || /^file:/i.test(src)) img.remove();
    });
    const pmParser = PMDOMParser.fromSchema(view.state.schema);
    const slice = pmParser.parseSlice(wrapper, { preserveWhitespace: false });
    event.preventDefault();
    view.dispatch(view.state.tr.replaceSelection(slice).scrollIntoView());
    return true;
  } catch (e) {
    console.warn('[TablePaste] Parse failed, falling back to default paste:', e);
    return false;
  }
}

function getClipboardImageFile(event: ClipboardEvent): File | null {
  const clipboardData = event.clipboardData;
  if (!clipboardData) return null;

  const itemFile = Array.from(clipboardData.items ?? [])
    .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
    .map(item => item.getAsFile())
    .find((file): file is File => !!file);
  if (itemFile) return itemFile;

  const file = Array.from(clipboardData.files ?? []).find(item => item.type.startsWith('image/'));
  return file ?? null;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export function handleImagePaste(view: any, event: ClipboardEvent, callbacks: ImagePasteCallbacks = {}): boolean {
  const file = getClipboardImageFile(event);
  if (!file) return false;

  const imageNodeFactory = view.state.schema.nodes.image;
  if (!imageNodeFactory) return false;

  if (file.size > MAX_IMAGE_SIZE) {
    alert(`이미지 크기가 너무 큽니다. 10MB 이하만 붙여넣기 가능합니다.\n(현재: ${(file.size / 1024 / 1024).toFixed(1)}MB)`);
    event.preventDefault();
    return true;
  }

  event.preventDefault();
  callbacks.onStart?.();

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result !== 'string' || !reader.result) return;
    const node = imageNodeFactory.create({ src: reader.result, alt: file.name });
    const tr = view.state.tr.replaceSelectionWith(node).scrollIntoView();
    view.dispatch(tr);
  };
  reader.onloadend = () => {
    callbacks.onFinish?.();
  };
  try {
    reader.readAsDataURL(file);
  } catch {
    callbacks.onFinish?.();
  }

  return true;
}

export function handleImageDrop(view: any, event: DragEvent, callbacks: ImagePasteCallbacks = {}): boolean {
  const files = Array.from((event as any).dataTransfer?.files ?? []) as File[];
  const imageFile = files.find(f => f.type.startsWith('image/'));
  if (!imageFile) return false;

  const imageNodeFactory = view.state.schema.nodes.image;
  if (!imageNodeFactory) return false;

  if (imageFile.size > MAX_IMAGE_SIZE) {
    alert(`이미지 크기가 너무 큽니다. 10MB 이하만 가능합니다.\n(현재: ${(imageFile.size / 1024 / 1024).toFixed(1)}MB)`);
    event.preventDefault();
    return true;
  }

  event.preventDefault();
  callbacks.onStart?.();

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result !== 'string' || !reader.result) return;
    const coordinates = view.posAtCoords({ left: (event as any).clientX, top: (event as any).clientY });
    const pos = coordinates ? coordinates.pos : view.state.selection.from;
    const node = imageNodeFactory.create({ src: reader.result, alt: imageFile.name });
    const tr = view.state.tr.insert(pos, node).scrollIntoView();
    view.dispatch(tr);
  };
  reader.onloadend = () => {
    callbacks.onFinish?.();
  };
  try {
    reader.readAsDataURL(imageFile);
  } catch {
    callbacks.onFinish?.();
  }

  return true;
}
