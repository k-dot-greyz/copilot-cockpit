import { describe, expect, it } from 'vitest';
import { escapeAttr } from './glitch-media-card';

describe('escapeAttr', () => {
  it('neutralizes attribute breakout characters', () => {
    expect(escapeAttr('a&b')).toBe('a&amp;b');
    expect(escapeAttr('say"hello')).toBe('say&quot;hello');
    expect(escapeAttr('<script>')).toBe('&lt;script>');
  });
});
