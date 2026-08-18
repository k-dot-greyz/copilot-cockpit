import type { PR, PRApiResponse } from '../github';

export function makePR(overrides: Partial<PR> & Pick<PR, 'number'>): PR {
  return {
    title: 'Test PR',
    author: 'k-dot-greyz',
    authorType: 'human',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    headRefName: 'feature-branch',
    isDraft: false,
    reviewDecision: null,
    labels: [],
    url: `https://github.com/o/r/pull/${overrides.number}`,
    ...overrides,
  };
}

export function makeApiPR(
  overrides: Partial<PRApiResponse> & Pick<PRApiResponse, 'number'>
): PRApiResponse {
  return {
    title: 'API PR',
    user: { login: 'k-dot-greyz', type: 'User' },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    head: { ref: 'feature-branch' },
    draft: false,
    requested_reviewers: [],
    labels: [],
    html_url: `https://github.com/o/r/pull/${overrides.number}`,
    ...overrides,
  };
}

export const MOCK_PRS: PR[] = [
  makePR({
    number: 101,
    title: 'feat(auth): support token-based authentication session flow',
    author: 'k-dot-greyz',
    authorType: 'human',
    isDraft: false,
    createdAt: '2026-08-18T09:00:00Z',
    updatedAt: '2026-08-18T09:30:00Z',
    headRefName: 'feat/auth-session-flow',
  }),
  makePR({
    number: 102,
    title: 'docs(architecture): update GW-AAP integration spec and sequence flows',
    author: 'k-dot-greyz',
    authorType: 'human',
    isDraft: true,
    createdAt: '2026-08-18T08:00:00Z',
    updatedAt: '2026-08-18T08:45:00Z',
    headRefName: 'docs/gwaap-spec',
  }),
  makePR({
    number: 103,
    title: 'test(triage): add test coverage for duplicate title alerts',
    author: 'copilot[bot]',
    authorType: 'bot',
    isDraft: false,
    createdAt: '2026-08-18T07:30:00Z',
    updatedAt: '2026-08-18T07:35:00Z',
    headRefName: 'bot/coverage-duplicate-alerts',
  }),
  makePR({
    number: 104,
    title: 'test(triage): add test coverage for duplicate title alerts',
    author: 'copilot[bot]',
    authorType: 'bot',
    isDraft: false,
    createdAt: '2026-08-18T07:00:00Z',
    updatedAt: '2026-08-18T07:05:00Z',
    headRefName: 'bot/coverage-duplicate-alerts-retry',
  }),
  makePR({
    number: 105,
    title: 'chore(deps): bump vite from 6.0.0 to 6.2.0',
    author: 'dependabot[bot]',
    authorType: 'bot',
    isDraft: false,
    createdAt: '2026-08-17T12:00:00Z',
    updatedAt: '2026-08-17T12:00:00Z',
    headRefName: 'dependabot/npm_and_yarn/vite-6.2.0',
  }),
  makePR({
    number: 106,
    title: 'fix(css): dark mode contrast on low-dpi display devices',
    author: 'external-contributor',
    authorType: 'external',
    isDraft: false,
    createdAt: '2026-08-16T15:00:00Z',
    updatedAt: '2026-08-16T15:30:00Z',
    headRefName: 'patch-contrast-fix',
  }),
];
