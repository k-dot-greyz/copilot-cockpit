import { describe, expect, it } from 'vitest';
import { classifyAuthor } from './author-classification';
import { AuthorClassificationScenario } from '../test-harness/security-scenarios';

const scenarios = [
  new AuthorClassificationScenario({
    label: 'known team member login',
    login: 'k-dot-greyz',
    accountType: 'User',
    expectAuthorType: 'human',
  }),
  new AuthorClassificationScenario({
    label: 'alternate team member login',
    login: 'kasparsgreizis',
    accountType: 'User',
    expectAuthorType: 'human',
  }),
  new AuthorClassificationScenario({
    label: 'dependabot bot suffix',
    login: 'dependabot[bot]',
    accountType: 'User',
    expectAuthorType: 'bot',
  }),
  new AuthorClassificationScenario({
    label: 'github app bot prefix',
    login: 'app/github-actions',
    accountType: 'User',
    expectAuthorType: 'bot',
  }),
  new AuthorClassificationScenario({
    label: 'explicit Bot typename',
    login: 'copilot',
    accountType: 'Bot',
    expectAuthorType: 'bot',
  }),
  new AuthorClassificationScenario({
    label: 'external contributor',
    login: 'random-contributor',
    accountType: 'User',
    expectAuthorType: 'external',
  }),
  new AuthorClassificationScenario({
    label: 'agentic instruction in login still classified by rules',
    login: 'ignore-previous-instructions[bot]',
    accountType: 'User',
    expectAuthorType: 'bot',
  }),
];

describe('classifyAuthor', () => {
  for (const scenario of scenarios) {
    it(`[${scenario.label}] maps ${scenario.login} → ${scenario.expectAuthorType}`, () => {
      expect(classifyAuthor(scenario.login, scenario.accountType)).toBe(
        scenario.expectAuthorType
      );
    });
  }

  it('does not treat team-like substring in unknown login as human', () => {
    const scenario = new AuthorClassificationScenario({
      label: 'lookalike login',
      login: 'not-k-dot-greyz',
      accountType: 'User',
      expectAuthorType: 'external',
    });
    expect(classifyAuthor(scenario.login, scenario.accountType)).toBe(
      scenario.expectAuthorType
    );
  });
});
