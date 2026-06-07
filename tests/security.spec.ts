/**
 * Security regressions for PR triage dashboard boundaries.
 * Pure-function coverage — no live GitHub session required.
 */
import { expect, test } from '@playwright/test';
import { isAllowedGithubPrUrl, sanitizePrUrl } from '../src/lib/validation/pr-url';
import { shouldHandleRefreshShortcut } from '../src/lib/keyboard-guards';
import { detectFlood } from '../src/lib/triage';
import { makePR } from '../src/lib/fixtures/pr';

test.describe('PR link allowlist (XSS / open redirect)', () => {
  test('blocks javascript: and github lookalike hosts', () => {
    expect(isAllowedGithubPrUrl('javascript:alert(1)')).toBe(false);
    expect(
      isAllowedGithubPrUrl('https://github.com.attacker.example/o/r/pull/1')
    ).toBe(false);
    expect(sanitizePrUrl('https://evil.com/o/r/pull/1')).toBe('#');
  });

  test('allows canonical https github pull URLs', () => {
    const url = 'https://github.com/k-dot-greyz/dev-master/pull/526';
    expect(isAllowedGithubPrUrl(url)).toBe(true);
    expect(sanitizePrUrl(url)).toBe(url);
  });
});

test.describe('Destructive UX race guard', () => {
  test('refresh shortcut disabled during bulk-close', () => {
    expect(
      shouldHandleRefreshShortcut('R', null, {
        isClosing: true,
        loading: false,
      })
    ).toBe(false);
  });
});

test.describe('Flood detection boundary', () => {
  test('requires minCount before nuke-eligible flood', () => {
    const prs = Array.from({ length: 9 }, (_, i) =>
      makePR({
        number: i + 1,
        headRefName: `greyzxc/regression-shield-${(i + 1).toString(16).padStart(4, '0')}`,
        authorType: 'bot',
      })
    );

    expect(detectFlood(prs, 10)).toEqual([]);
    expect(detectFlood(prs, 9)).toHaveLength(1);
  });
});
