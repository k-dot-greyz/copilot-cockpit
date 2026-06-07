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

  it('parses commits, files, reviews, and linked issues correctly', () => {
    const rawNode = {
      number: 200,
      title: 'PR with rich data',
      body: 'body text',
      state: 'MERGED',
      draft: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      url: 'https://github.com/o/r/pull/200',
      headRefName: 'feat/rich',
      baseRefName: 'main',
      additions: 30,
      deletions: 5,
      changedFiles: 2,
      mergeable: 'MERGEABLE',
      reviewDecision: 'CHANGES_REQUESTED',
      author: { login: 'k-dot-greyz', avatarUrl: 'https://avatars.com/k' },
      commits: {
        nodes: [
          {
            commit: {
              oid: 'abc1234567890',
              abbreviatedOid: 'abc1234',
              message: 'feat: initial commit',
              committedDate: '2026-01-01T10:00:00Z',
              author: { name: 'Dev' },
            },
          },
          // node with null commit should be skipped
          { commit: null },
        ],
      },
      files: {
        nodes: [
          { path: 'src/index.ts', additions: 20, deletions: 3 },
          { path: 'src/utils.ts', additions: 10, deletions: 2 },
        ],
      },
      reviews: {
        nodes: [
          {
            author: { login: 'reviewer' },
            state: 'CHANGES_REQUESTED',
            body: 'Please refactor.',
            submittedAt: '2026-01-01T15:00:00Z',
          },
          // malformed review state should default to PENDING
          {
            author: { login: 'reviewer2' },
            state: 'NOT_A_REAL_STATE',
            body: '',
            submittedAt: '2026-01-01T16:00:00Z',
          },
        ],
      },
      closingIssuesReferences: {
        nodes: [
          { number: 10, title: 'Bug #10', url: 'https://github.com/o/r/issues/10' },
        ],
      },
    };

    const result = validateAndMapGraphQLPRDetail(rawNode);

    expect(result.state).toBe('MERGED');
    expect(result.reviewDecision).toBe('CHANGES_REQUESTED');
    expect(result.commits).toHaveLength(1);
    expect(result.commits[0]).toEqual({
      oid: 'abc1234567890',
      abbreviatedOid: 'abc1234',
      message: 'feat: initial commit',
      committedDate: '2026-01-01T10:00:00Z',
      authorName: 'Dev',
    });
    expect(result.files).toHaveLength(2);
    expect(result.files[0]).toEqual({ path: 'src/index.ts', additions: 20, deletions: 3 });
    expect(result.reviews).toHaveLength(2);
    expect(result.reviews[0].state).toBe('CHANGES_REQUESTED');
    expect(result.reviews[1].state).toBe('PENDING');
    expect(result.linkedIssues).toHaveLength(1);
    expect(result.linkedIssues[0]).toEqual({
      number: 10,
      title: 'Bug #10',
      url: 'https://github.com/o/r/issues/10',
    });
  });
});

describe('validateAndMapGraphQLPR — additional edge cases', () => {
  it('classifies bot authors by [bot] suffix in login', () => {
    const node = {
      number: 1,
      author: { login: 'dependabot[bot]', __typename: 'User' },
      headRef: null,
      labels: { nodes: [] },
      comments: { totalCount: 0 },
      url: 'https://github.com/o/r/pull/1',
    };
    const result = validateAndMapGraphQLPR(node);
    expect(result.authorType).toBe('bot');
  });

  it('classifies bot authors by Bot __typename', () => {
    const node = {
      number: 2,
      author: { login: 'copilot', __typename: 'Bot' },
      headRef: null,
      labels: { nodes: [] },
      comments: { totalCount: 0 },
      url: 'https://github.com/o/r/pull/2',
    };
    const result = validateAndMapGraphQLPR(node);
    expect(result.authorType).toBe('bot');
  });

  it('classifies bot authors by app/ prefix in login', () => {
    const node = {
      number: 3,
      author: { login: 'app/github-actions', __typename: 'User' },
      headRef: null,
      labels: { nodes: [] },
      comments: { totalCount: 0 },
      url: 'https://github.com/o/r/pull/3',
    };
    const result = validateAndMapGraphQLPR(node);
    expect(result.authorType).toBe('bot');
  });

  it('maps checksStatus to failure for FAILURE rollup state', () => {
    const node = {
      number: 4,
      headRef: {
        target: {
          statusCheckRollup: { state: 'FAILURE' },
        },
      },
      labels: { nodes: [] },
      comments: { totalCount: 0 },
      url: 'https://github.com/o/r/pull/4',
    };
    const result = validateAndMapGraphQLPR(node);
    expect(result.checksStatus).toBe('failure');
  });

  it('maps checksStatus to failure for ERROR rollup state', () => {
    const node = {
      number: 5,
      headRef: {
        target: {
          statusCheckRollup: { state: 'ERROR' },
        },
      },
      labels: { nodes: [] },
      comments: { totalCount: 0 },
      url: 'https://github.com/o/r/pull/5',
    };
    const result = validateAndMapGraphQLPR(node);
    expect(result.checksStatus).toBe('failure');
  });

  it('maps checksStatus to pending for PENDING rollup state', () => {
    const node = {
      number: 6,
      headRef: {
        target: {
          statusCheckRollup: { state: 'PENDING' },
        },
      },
      labels: { nodes: [] },
      comments: { totalCount: 0 },
      url: 'https://github.com/o/r/pull/6',
    };
    const result = validateAndMapGraphQLPR(node);
    expect(result.checksStatus).toBe('pending');
  });

  it('maps checksStatus to pending for EXPECTED rollup state', () => {
    const node = {
      number: 7,
      headRef: {
        target: {
          statusCheckRollup: { state: 'EXPECTED' },
        },
      },
      labels: { nodes: [] },
      comments: { totalCount: 0 },
      url: 'https://github.com/o/r/pull/7',
    };
    const result = validateAndMapGraphQLPR(node);
    expect(result.checksStatus).toBe('pending');
  });

  it('maps mergeable to CONFLICTING', () => {
    const node = {
      number: 8,
      mergeable: 'CONFLICTING',
      headRef: null,
      labels: { nodes: [] },
      comments: { totalCount: 0 },
      url: 'https://github.com/o/r/pull/8',
    };
    const result = validateAndMapGraphQLPR(node);
    expect(result.mergeable).toBe('CONFLICTING');
  });

  it('maps state CLOSED and MERGED correctly', () => {
    const closedNode = {
      number: 9,
      state: 'CLOSED',
      headRef: null,
      labels: { nodes: [] },
      comments: { totalCount: 0 },
      url: 'https://github.com/o/r/pull/9',
    };
    expect(validateAndMapGraphQLPR(closedNode).state).toBe('CLOSED');

    const mergedNode = { ...closedNode, number: 10, state: 'MERGED' };
    expect(validateAndMapGraphQLPR(mergedNode).state).toBe('MERGED');
  });

  it('maps CHANGES_REQUESTED and REVIEW_REQUIRED reviewDecision', () => {
    const changesNode = {
      number: 11,
      reviewDecision: 'CHANGES_REQUESTED',
      headRef: null,
      labels: { nodes: [] },
      comments: { totalCount: 0 },
      url: 'https://github.com/o/r/pull/11',
    };
    expect(validateAndMapGraphQLPR(changesNode).reviewDecision).toBe('CHANGES_REQUESTED');

    const requiredNode = { ...changesNode, number: 12, reviewDecision: 'REVIEW_REQUIRED' };
    expect(validateAndMapGraphQLPR(requiredNode).reviewDecision).toBe('REVIEW_REQUIRED');
  });

  it('sanitizes XSS URLs from GraphQL nodes', () => {
    const node = {
      number: 13,
      url: 'javascript:alert("xss")',
      headRef: null,
      labels: { nodes: [] },
      comments: { totalCount: 0 },
    };
    const result = validateAndMapGraphQLPR(node);
    expect(result.url).toBe('#');
  });

  it('filters null and nameless entries from labels', () => {
    const node = {
      number: 14,
      labels: {
        nodes: [null, { name: 'valid-label' }, { notName: true }, { name: '' }],
      },
      headRef: null,
      comments: { totalCount: 0 },
      url: 'https://github.com/o/r/pull/14',
    };
    const result = validateAndMapGraphQLPR(node);
    expect(result.labels).toEqual(['valid-label']);
  });
});
