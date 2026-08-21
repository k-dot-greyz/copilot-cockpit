/**
 * Security regressions for PR triage dashboard boundaries.
 * Scenarios are constructor-configured via SecurityPlaywrightScenarios.
 */
import { expect, test } from '@playwright/test';
import { isAllowedGithubPrUrl, sanitizePrUrl } from '../src/lib/validation/pr-url';
import { shouldHandleRefreshShortcut } from '../src/lib/keyboard-guards';
import { detectFlood } from '../src/lib/triage';
import { classifyAuthor } from '../src/lib/validation/author-classification';
import { filterPRs } from '../src/lib/filters';
import { validateOAuthState, OAUTH_STATE_KEY } from '../src/lib/auth/oauth';
import { makePR } from '../src/lib/fixtures/pr';
import { SecurityPlaywrightScenarios } from './harness/security-playwright';

const harness = new SecurityPlaywrightScenarios();

test.describe('PR link allowlist (XSS / open redirect)', () => {
  for (const scenario of harness.urlScenarios) {
    test(`[${scenario.label}] allowlist boundary`, () => {
      expect(isAllowedGithubPrUrl(scenario.url)).toBe(scenario.expectAllowed);
      if (scenario.expectSanitized !== undefined) {
        expect(sanitizePrUrl(scenario.url)).toBe(scenario.expectSanitized);
      }
    });
  }
});

test.describe('OAuth CSRF state validation', () => {
  for (const scenario of harness.oauthStateScenarios) {
    test(`[${scenario.label}]`, () => {
      const store: Record<string, string> = {};
      const sessionStorageMock = {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
      };

      (globalThis as { sessionStorage?: typeof sessionStorageMock }).sessionStorage =
        sessionStorageMock;

      if (scenario.storedState) {
        sessionStorageMock.setItem(OAUTH_STATE_KEY, scenario.storedState);
      }

      const result = validateOAuthState(scenario.callbackState);
      expect(result).toBe(scenario.expectValid);
    });
  }
});

test.describe('Author classification under hostile logins', () => {
  for (const scenario of harness.authorScenarios) {
    test(`[${scenario.label}]`, () => {
      expect(classifyAuthor(scenario.login, scenario.accountType)).toBe(
        scenario.expectAuthorType
      );
    });
  }
});

test.describe('Filter search injection resistance', () => {
  const baselinePrs = [
    makePR({ number: 1, title: 'Routine maintenance', headRefName: 'chore/upkeep' }),
    makePR({ number: 2, title: 'Feature rollout', headRefName: 'feat/rollout' }),
  ];

  for (const scenario of harness.filterInjectionScenarios) {
    test(`[${scenario.label}] returns safe empty match`, () => {
      const matches = filterPRs(baselinePrs, { searchQuery: scenario.searchQuery });
      expect(matches).toHaveLength(scenario.expectMatchCount);
    });
  }
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
