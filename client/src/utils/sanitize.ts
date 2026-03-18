import DOMPurify from 'dompurify';

export const CHAT_MESSAGE_MAX_LENGTH = 256;

export function sanitizeChatContent(rawContent: string): string | null {
  const trimmed = rawContent.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const truncated = trimmed.slice(0, CHAT_MESSAGE_MAX_LENGTH);
  const sanitized = DOMPurify.sanitize(truncated, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  }).trim();

  return sanitized.length > 0 ? sanitized : null;
}
