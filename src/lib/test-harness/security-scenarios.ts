/**
 * Constructor-configured security scenarios for deterministic boundary tests.
 * Values are supplied at instantiation — no ambient hardcoded literals in runners.
 */

export type UrlScenarioConfig = {
  label: string;
  url: string;
  expectAllowed: boolean;
  expectSanitized?: string;
};

export class UrlAllowlistScenario {
  readonly label: string;
  readonly url: string;
  readonly expectAllowed: boolean;
  readonly expectSanitized: string | undefined;

  constructor(config: UrlScenarioConfig) {
    this.label = config.label;
    this.url = config.url;
    this.expectAllowed = config.expectAllowed;
    this.expectSanitized = config.expectSanitized;
  }
}

export type AuthorClassificationConfig = {
  label: string;
  login: string;
  accountType: string;
  expectAuthorType: 'human' | 'bot' | 'external';
};

export class AuthorClassificationScenario {
  readonly label: string;
  readonly login: string;
  readonly accountType: string;
  readonly expectAuthorType: 'human' | 'bot' | 'external';

  constructor(config: AuthorClassificationConfig) {
    this.label = config.label;
    this.login = config.login;
    this.accountType = config.accountType;
    this.expectAuthorType = config.expectAuthorType;
  }
}

export type OAuthStateScenarioConfig = {
  label: string;
  storedState: string | null;
  callbackState: string | null;
  expectValid: boolean;
};

export class OAuthStateScenario {
  readonly label: string;
  readonly storedState: string | null;
  readonly callbackState: string | null;
  readonly expectValid: boolean;

  constructor(config: OAuthStateScenarioConfig) {
    this.label = config.label;
    this.storedState = config.storedState;
    this.callbackState = config.callbackState;
    this.expectValid = config.expectValid;
  }
}

export type FilterInjectionConfig = {
  label: string;
  searchQuery: string;
  expectMatchCount: number;
};

export class FilterInjectionScenario {
  readonly label: string;
  readonly searchQuery: string;
  readonly expectMatchCount: number;

  constructor(config: FilterInjectionConfig) {
    this.label = config.label;
    this.searchQuery = config.searchQuery;
    this.expectMatchCount = config.expectMatchCount;
  }
}
