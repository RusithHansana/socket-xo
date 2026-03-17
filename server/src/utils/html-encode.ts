const HTML_ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
};

const ESCAPABLE_HTML_CHARS = /[&<>"'`]/g;

export function encodeHtml(content: string): string {
  return content.replace(ESCAPABLE_HTML_CHARS, (char) => HTML_ENTITY_MAP[char] ?? char);
}
