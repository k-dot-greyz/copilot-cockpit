import { describe, expect, it } from 'vitest';
import { validateAndMapGraphQLPR, validateAndMapGraphQLPRDetail } from './graphql';

describe('validateAndMapGraphQLPR', () => {
  it('correctly maps a valid GraphQL PR node', () => {
    const rawNode = {
      number: 42,
      title: 'Add support for GraphQL',
      state: 'OPEN',
      draft: false,
      createdAt: '2026-06-01T12:00:00Z',
      updatedAt: '2026-06-02T12:00:00Z',
      url: 'https://github.com/k-dot-greyz/dev-master/pull/42',
      headRefName: 'feat/graphql',
      mergeable: 'MERGEABLE',
      reviewDecision: 'APPROVED',
      additions: 150,
      deletions: 20,
      author: {
        login: 'k-dot-greyz',
        __typename: 'User',
      },
      comments: {
        totalCount: 5,
      },
      labels: {
        nodes: [{ name: 'enhancement' }, { name: 'triage' }],
      },
      headRef: {
        target: {
          statusCheckRollup: {
            state: 'SUCCESS',
          },
        },
      },
    };

    const result = validateAndMapGraphQLPR(rawNode);

    expect(result).toEqual({
      number: 42,
      title: 'Add support for GraphQL',
      author: 'k-dot-greyz',
      authorType: 'human',
      createdAt: '2026-06-01T12:00:00Z',
      updatedAt: '2026-06-02T12:00:00Z',
      headRefName: 'feat/graphql',
      isDraft: false,
      reviewDecision: 'APPROVED',
      labels: ['enhancement', 'triage'],
      url: 'https://github.com/k-dot-greyz/dev-master/pull/42',
      checksStatus: 'success',
      mergeable: 'MERGEABLE',
      state: 'OPEN',
      commentsCount: 5,
      additions: 150,
      deletions: 20,
    });
  });

  it('gracefully handles malformed or missing fields with safe defaults', () => {
    const rawNode = {
      number: 'not-a-number', // invalid type
      title: null,
      state: 'SUPER_OPEN', // invalid enum
      draft: 'yes', // invalid type
      createdAt: 12345,
      updatedAt: {},
      url: 'javascript:alert("XSS")', // unsafe url
      headRefName: null,
      mergeable: 'UNKNOWN_STATE',
      reviewDecision: 'WAITING_FOR_GODOT',
      additions: 'many',
      deletions: -10,
      author: null,
      comments: null,
      labels: null,
      headRef: null,
    };

    const result = validateAndMapGraphQLPR(rawNode);

    expect(result).toEqual({
      number: 0,
      title: '',
      author: 'unknown',
      authorType: 'external',
      createdAt: '',
      updatedAt: '',
      headRefName: '',
      isDraft: false,
      reviewDecision: null,
      labels: [],
      url: '#',
      checksStatus: 'none',
      mergeable: 'UNKNOWN',
      state: 'OPEN',
      commentsCount: 0,
      additions: 0,
      deletions: 0,
    });
  });

  it('handles empty or null node safely', () => {
    const result = validateAndMapGraphQLPR(null);
    expect(result.number).toBe(0);
    expect(result.title).toBe('Malformed PR');
    expect(result.url).toBe('#');
  });
});

describe('validateAndMapGraphQLPRDetail', () => {
  it('correctly maps a valid GraphQL PR Detail node', () => {
    const rawNode = {
      number: 101,
      title: 'Implement OAuth',
      body: 'This PR adds OAuth support.',
      state: 'OPEN',
      draft: false,
      createdAt: '2026-06-01T12:00:00Z',
      updatedAt: '2026-06-02T12:00:00Z',
      url: 'https://github.com/o/r/pull/101',
      headRefName: 'feat/oauth',
      baseRefName: 'main',
      additions: 50,
      deletions: 10,
      changedFiles: 3,
      mergeable: 'MERGEABLE',
      reviewDecision: 'APPROVED',
      author: {
        login: 'k-dot-greyz',
        avatarUrl: 'https://avatar.com/k-dot-greyz',
      },
      commits: {
        nodes: [
          {
            commit: {
              oid: 'sha123',
              abbreviatedOid: 'sha12',
              message: 'feat: add oauth client',
              committedDate: '2026-06-01T12:05:00Z',
              author: {
                name: 'Kaspars',
              },
            },
          },
        ],
      },
      files: {
        nodes: [
          {
            path: 'src/oauth.ts',
            additions: 50,
            deletions: 10,
          },
        ],
      },
      reviews: {
        nodes: [
          {
            author: {
              login: 'reviewer1',
            },
            state: 'APPROVED',
            body: 'LGTM!',
            submittedAt: '2026-06-02T10:00:00Z',
          },
        ],
      },
      closingIssuesReferences: {
        nodes: [
          {
            number: 42,
            title: 'OAuth Issue',
            url: 'https://github.com/o/r/issues/42',
          },
        ],
      },
    };

    const result = validateAndMapGraphQLPRDetail(rawNode);

    expect(result).toEqual({
      number: 101,
      title: 'Implement OAuth',
      body: 'This PR adds OAuth support.',
      state: 'OPEN',
      draft: false,
      createdAt: '2026-06-01T12:00:00Z',
      updatedAt: '2026-06-02T12:00:00Z',
      url: 'https://github.com/o/r/pull/101',
      headRefName: 'feat/oauth',
      baseRefName: 'main',
      additions: 50,
      deletions: 10,
      changedFiles: 3,
      mergeable: 'MERGEABLE',
      reviewDecision: 'APPROVED',
      author: 'k-dot-greyz',
      authorAvatarUrl: 'https://avatar.com/k-dot-greyz',
      commits: [
        {
          oid: 'sha123',
          abbreviatedOid: 'sha12',
          message: 'feat: add oauth client',
          committedDate: '2026-06-01T12:05:00Z',
          authorName: 'Kaspars',
        },
      ],
      files: [
        {
          path: 'src/oauth.ts',
          additions: 50,
          deletions: 10,
        },
      ],
      reviews: [
        {
          author: 'reviewer1',
          state: 'APPROVED',
          body: 'LGTM!',
          submittedAt: '2026-06-02T10:00:00Z',
        },
      ],
      linkedIssues: [
        {
          number: 42,
          title: 'OAuth Issue',
          url: 'https://github.com/o/r/issues/42',
        },
      ],
    });
  });

  it('gracefully handles malformed or missing fields in PR Detail', () => {
    const rawNode = {
      number: 'not-a-number',
      title: null,
      body: null,
      state: 'SUPER_OPEN',
      draft: 'no',
      createdAt: 12345,
      updatedAt: {},
      url: 'javascript:alert("XSS")',
      headRefName: null,
      baseRefName: null,
      additions: 'many',
      deletions: -10,
      changedFiles: -5,
      mergeable: 'UNKNOWN_STATE',
      reviewDecision: 'WAITING',
      author: null,
      commits: null,
      files: null,
      reviews: null,
      closingIssuesReferences: null,
    };

    const result = validateAndMapGraphQLPRDetail(rawNode);

    expect(result).toEqual({
      number: 0,
      title: '',
      body: '',
      state: 'OPEN',
      draft: false,
      createdAt: '',
      updatedAt: '',
      url: '#',
      headRefName: '',
      baseRefName: '',
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      mergeable: 'UNKNOWN',
      reviewDecision: null,
      author: 'unknown',
      authorAvatarUrl: '',
      commits: [],
      files: [],
      reviews: [],
      linkedIssues: [],
    });
  });

  it('handles empty or null node safely in PR Detail', () => {
    const result = validateAndMapGraphQLPRDetail(null);
    expect(result.number).toBe(0);
    expect(result.title).toBe('Malformed PR Detail');
    expect(result.url).toBe('#');
  });
});
