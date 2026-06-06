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
