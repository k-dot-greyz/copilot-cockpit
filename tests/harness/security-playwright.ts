/**
 * Playwright-oriented security scenario harness (constructor-configured).
 */
import {
  AuthorClassificationScenario,
  FilterInjectionScenario,
  OAuthStateScenario,
  UrlAllowlistScenario,
} from '../../src/lib/test-harness/security-scenarios';

export class SecurityPlaywrightScenarios {
  readonly urlScenarios: UrlAllowlistScenario[];
  readonly oauthStateScenarios: OAuthStateScenario[];
  readonly authorScenarios: AuthorClassificationScenario[];
  readonly filterInjectionScenarios: FilterInjectionScenario[];

  constructor() {
    this.urlScenarios = [
      new UrlAllowlistScenario({
        label: 'javascript open redirect',
        url: 'javascript:alert(document.domain)',
        expectAllowed: false,
        expectSanitized: '#',
      }),
      new UrlAllowlistScenario({
        label: 'github subdomain lookalike',
        url: 'https://github.com.evil.example/o/r/pull/1',
        expectAllowed: false,
        expectSanitized: '#',
      }),
      new UrlAllowlistScenario({
        label: 'canonical PR URL',
        url: 'https://github.com/k-dot-greyz/dev-master/pull/526',
        expectAllowed: true,
        expectSanitized: 'https://github.com/k-dot-greyz/dev-master/pull/526',
      }),
    ];

    this.oauthStateScenarios = [
      new OAuthStateScenario({
        label: 'matching CSRF state',
        storedState: 'expected-state-token',
        callbackState: 'expected-state-token',
        expectValid: true,
      }),
      new OAuthStateScenario({
        label: 'agent-injected state mismatch',
        storedState: 'legitimate-state',
        callbackState: 'malicious-state-from-callback',
        expectValid: false,
      }),
      new OAuthStateScenario({
        label: 'missing callback state',
        storedState: 'legitimate-state',
        callbackState: null,
        expectValid: false,
      }),
    ];

    this.authorScenarios = [
      new AuthorClassificationScenario({
        label: 'bot flood agent branch',
        login: 'greyzxcursor[bot]',
        accountType: 'Bot',
        expectAuthorType: 'bot',
      }),
    ];

    this.filterInjectionScenarios = [
      new FilterInjectionScenario({
        label: 'SQL-style injection in search',
        searchQuery: "' OR 1=1 --",
        expectMatchCount: 0,
      }),
      new FilterInjectionScenario({
        label: 'script tag in search',
        searchQuery: '<script>alert(1)</script>',
        expectMatchCount: 0,
      }),
    ];
  }
}
