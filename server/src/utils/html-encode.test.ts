import { describe, expect, it } from 'vitest';
import { encodeHtml } from './html-encode.js';

describe('encodeHtml', () => {
  it('encodes core HTML control characters', () => {
    const input = '<script>alert("x") & test</script>';

    expect(encodeHtml(input)).toBe('&lt;script&gt;alert(&quot;x&quot;) &amp; test&lt;/script&gt;');
  });

  it('encodes apostrophes and backticks to reduce attribute/context breakouts', () => {
    const input = "I'm using `inline` code";

    expect(encodeHtml(input)).toBe('I&#39;m using &#96;inline&#96; code');
  });

  it('returns unchanged text when no escapable characters are present', () => {
    expect(encodeHtml('plain message 123')).toBe('plain message 123');
  });

  it('returns empty string for empty input', () => {
    expect(encodeHtml('')).toBe('');
  });
});
