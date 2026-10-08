import { describe, expect, it } from 'vitest';
import { isSiteRelativePath, sanitizeSiteRelativePath } from './is-site-relative-path';

describe('isSiteRelativePath', () => {
  it('accepts site-relative paths', () => {
    expect(isSiteRelativePath('/screenshots/foo.webp')).toBe(true);
  });

  it('rejects javascript/data schemes, protocol-relative, and remote URLs', () => {
    for (const evil of [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      '//evil.example/steal',
      'https://evil.example/x',
    ]) {
      expect(isSiteRelativePath(evil), evil).toBe(false);
    }
  });

  it('drops hostile paths to empty string', () => {
    expect(sanitizeSiteRelativePath('/media/ok.webp')).toBe('/media/ok.webp');
    expect(sanitizeSiteRelativePath('javascript:alert(1)')).toBe('');
  });
});
