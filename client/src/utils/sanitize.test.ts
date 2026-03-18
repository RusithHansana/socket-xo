// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { sanitizeChatContent, CHAT_MESSAGE_MAX_LENGTH } from './sanitize';

describe('sanitizeChatContent', () => {
  it('returns null for empty or whitespace-only input', () => {
    expect(sanitizeChatContent('')).toBeNull();
    expect(sanitizeChatContent('   \n\t   ')).toBeNull();
  });

  it('trims and strips tags and attributes to plain text', () => {
    expect(sanitizeChatContent('   <b>Hello</b> <img src=x onerror=alert(1)> world   ')).toBe('Hello  world');
  });

  it('returns null when sanitization removes all content', () => {
    expect(sanitizeChatContent('<script>alert(1)</script>')).toBeNull();
    expect(sanitizeChatContent('<div></div>')).toBeNull();
  });

  it('truncates messages to the 256-character max length', () => {
    const longMessage = 'x'.repeat(CHAT_MESSAGE_MAX_LENGTH + 20);

    const sanitized = sanitizeChatContent(longMessage);

    expect(sanitized).not.toBeNull();
    expect(sanitized).toHaveLength(CHAT_MESSAGE_MAX_LENGTH);
  });
});
