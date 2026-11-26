const HTML_HINT = /<(p|div|br|table|img|ul|ol|li|h\d)\b/i;

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 엑셀 업로드 등으로 저장된 평문을 편집기용 문단 HTML로 바꾼다. */
export function toEditorHtml(text: string | null | undefined): string {
  if (!text) return '';
  if (HTML_HINT.test(text)) return text;
  return text.split(/\r?\n/).map(line => `<p>${escapeHtml(line)}</p>`).join('');
}

/** 글자·표·이미지가 하나도 없으면 빈 본문으로 본다. */
export function isRichEmpty(html: string | null | undefined): boolean {
  if (!html) return true;
  if (/<(img|table)\b/i.test(html)) return false;
  return !html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
}
