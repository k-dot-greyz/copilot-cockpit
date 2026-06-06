import { describe, expect, it } from 'vitest';
import { isAllowedGithubPrUrl, sanitizePrUrl } from './pr-url';

describe('isAllowedGithubPrUrl', () => {
  it('accepts legitimate github.com pull links', () => {
    expect(
      isAllowedGithubPrUrl('https://github.com/k-dot-greyz/dev-master/pull/999')
    ).toBe(true);
    expect(
      isAllowedGithubPrUrl('https://www.github.com/o/r/pull/1/')
    ).toBe(true);
  });

  it('rejects javascript and data URL schemes', () => {
    expect(
      isAllowedGithubPrUrl('javascript:alert(1)//github.com/o/r/pull/1')
    ).toBe(false);
    expect(isAllowedGithubPrUrl('data:text/html,<script>')).toBe(false);
  });

  it('rejects lookalike hosts and userinfo smuggling', () => {
    expect(
      isAllowedGithubPrUrl('https://github.com.evil.example/o/r/pull/1')
    ).toBe(false);
    expect(
      isAllowedGithubPrUrl('https://github.com@evil.example/o/r/pull/1')
    ).toBe(false);
  });

  it('rejects non-pull paths on github.com', () => {
    expect(isAllowedGithubPrUrl('https://github.com/o/r/issues/1')).toBe(false);
    expect(isAllowedGithubPrUrl('https://github.com/o/r')).toBe(false);
  });
});

describe('sanitizePrUrl', () => {
  it('returns # for hostile or missing URLs', () => {
    expect(sanitizePrUrl(null)).toBe('#');
    expect(sanitizePrUrl('javascript:void(0)')).toBe('#');
  });

  it('passes through allowed URLs unchanged', () => {
    const url = 'https://github.com/k-dot-greyz/dev-master/pull/42';
    expect(sanitizePrUrl(url)).toBe(url);
  });
});
