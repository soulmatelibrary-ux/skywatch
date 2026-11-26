export function injectLogLinks(html: string): string {
  return html.replace(/#LOG[:\-](\d+)/gi,
    (_, id) => `<a href="#log-${id}" class="sw-log-link" data-log-id="${id}">#${id} 일지</a>`
  );
}

export function injectTechDocLinks(html: string): string {
  return html.replace(/#TD[:\-](\d+)/gi,
    (_, id) => `<a href="#" class="sw-td-link" data-techdoc-id="${id}">#TD:${id}</a>`
  );
}
