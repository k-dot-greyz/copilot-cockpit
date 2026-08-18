import { describe, expect, it } from 'vitest';
import {
  isAllowedGithubAvatarUrl,
  isAllowedGithubIssueUrl,
  isAllowedGithubPrUrl,
  sanitizeGithubAvatarUrl,
  sanitizeGithubIssueUrl,
  sanitizePrUrl,
} from './pr-url';

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

  it('returns # for undefined input', () => {
    expect(sanitizePrUrl(undefined)).toBe('#');
  });

  it('returns # for empty string', () => {
    expect(sanitizePrUrl('')).toBe('#');
  });
});

describe('isAllowedGithubPrUrl - additional boundary cases', () => {
  it('rejects http (non-https) scheme', () => {
    expect(isAllowedGithubPrUrl('http://github.com/o/r/pull/1')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isAllowedGithubPrUrl('')).toBe(false);
  });

  it('rejects a completely unparseable string', () => {
    expect(isAllowedGithubPrUrl('not a url at all')).toBe(false);
  });

  it('rejects github.com PR path with extra path segments', () => {
    expect(isAllowedGithubPrUrl('https://github.com/o/r/pull/1/files')).toBe(
      false
    );
  });

  it('rejects a numeric path segment that is non-integer-looking', () => {
    expect(isAllowedGithubPrUrl('https://github.com/o/r/pull/abc')).toBe(false);
  });

  it('accepts PR urls with trailing slash', () => {
    expect(isAllowedGithubPrUrl('https://github.com/o/r/pull/123/')).toBe(true);
  });
});

describe('isAllowedGithubIssueUrl', () => {
  it('accepts legitimate github.com issue links', () => {
    expect(
      isAllowedGithubIssueUrl('https://github.com/k-dot-greyz/dev-master/issues/42')
    ).toBe(true);
  });

  it('rejects pull URLs and hostile hosts', () => {
    expect(
      isAllowedGithubIssueUrl('https://github.com/k-dot-greyz/dev-master/pull/42')
    ).toBe(false);
    expect(
      isAllowedGithubIssueUrl('https://evil.com/k-dot-greyz/dev-master/issues/42')
    ).toBe(false);
  });
});

describe('sanitizeGithubIssueUrl', () => {
  it('returns # for hostile or missing URLs', () => {
    expect(sanitizeGithubIssueUrl('javascript:alert(1)')).toBe('#');
    expect(sanitizeGithubIssueUrl(null)).toBe('#');
  });

  it('passes through allowed issue URLs unchanged', () => {
    const url = 'https://github.com/k-dot-greyz/dev-master/issues/42';
    expect(sanitizeGithubIssueUrl(url)).toBe(url);
  });
});

describe('isAllowedGithubAvatarUrl', () => {
  it('accepts legitimate avatars.githubusercontent.com URLs', () => {
    expect(
      isAllowedGithubAvatarUrl('https://avatars.githubusercontent.com/u/12345?v=4')
    ).toBe(true);
    expect(
      isAllowedGithubAvatarUrl('https://avatars.githubusercontent.com/u/1')
    ).toBe(true);
  });

  it('rejects javascript, data, and http schemes', () => {
    expect(
      isAllowedGithubAvatarUrl('javascript:alert(1)//avatars.githubusercontent.com/u/1')
    ).toBe(false);
    expect(isAllowedGithubAvatarUrl('data:text/html,<script>')).toBe(false);
    expect(
      isAllowedGithubAvatarUrl('http://avatars.githubusercontent.com/u/1')
    ).toBe(false);
  });

  it('rejects lookalike hosts and userinfo smuggling', () => {
    expect(
      isAllowedGithubAvatarUrl('https://avatars.githubusercontent.com.evil.example/u/1')
    ).toBe(false);
    expect(
      isAllowedGithubAvatarUrl('https://evil.com/avatars.githubusercontent.com/u/1')
    ).toBe(false);
    expect(
      isAllowedGithubAvatarUrl('https://user:pass@avatars.githubusercontent.com/u/1')
    ).toBe(false);
  });
});

describe('sanitizeGithubAvatarUrl', () => {
  it('returns empty string for hostile or missing URLs', () => {
    expect(sanitizeGithubAvatarUrl(null)).toBe('');
    expect(sanitizeGithubAvatarUrl(undefined)).toBe('');
    expect(sanitizeGithubAvatarUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeGithubAvatarUrl('https://evil.com/avatar.png')).toBe('');
  });

  it('passes through allowed avatar URLs unchanged', () => {
    const url = 'https://avatars.githubusercontent.com/u/12345?v=4';
    expect(sanitizeGithubAvatarUrl(url)).toBe(url);
  });
});
