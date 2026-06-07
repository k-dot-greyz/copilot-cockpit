import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bulkClosePRs,
  closePR,
  fetchOpenPRs,
  validateToken,
  fetchPRs,
  fetchPRDetail,
} from './github';
import { makeApiPR } from './fixtures/pr';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('fetchOpenPRs', () => {
  it('paginates until a short page and reports progress', async () => {
    vi.useFakeTimers();

    const page1 = Array.from({ length: 100 }, (_, i) =>
      makeApiPR({ number: i + 1 })
    );
    const page2 = [makeApiPR({ number: 101 })];

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({
          Link: '<https://api.github.com/repos/o/r/pulls?page=2>; rel="next", <https://api.github.com/repos/o/r/pulls?page=2>; rel="last"',
        }),
        json: async () => page1,
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => page2,
      });

    vi.stubGlobal('fetch', fetchMock);

    const progress: Array<[number, number]> = [];
    const resultPromise = fetchOpenPRs('o', 'r', 'token', (loaded, total) => {
      progress.push([loaded, total]);
    });
    await vi.runAllTimersAsync();
    const prs = await resultPromise;

    expect(prs).toHaveLength(101);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(progress[0]).toEqual([100, 200]);
    expect(progress[1]).toEqual([101, 101]);
  });

  it('sanitizes hostile html_url values from the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => [
          makeApiPR({
            number: 9,
            html_url: 'javascript:alert(document.cookie)',
          }),
        ],
      })
    );

    const prs = await fetchOpenPRs('o', 'r', 'token');
    expect(prs[0].url).toBe('#');
  });

  it('tolerates malformed label arrays without throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => [
          {
            ...makeApiPR({ number: 10 }),
            labels: [null, { name: 'ok' }, { nope: true }],
          },
        ],
      })
    );

    const prs = await fetchOpenPRs('o', 'r', 'token');
    expect(prs[0].labels).toEqual(['ok']);
  });

  it('maps author types and throws on non-OK responses', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => [
          makeApiPR({ number: 1, user: { login: 'k-dot-greyz', type: 'User' } }),
          makeApiPR({ number: 2, user: { login: 'dependabot[bot]', type: 'Bot' } }),
          makeApiPR({ number: 3, user: { login: 'stranger', type: 'User' } }),
        ],
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'bad credentials',
      });

    vi.stubGlobal('fetch', fetchMock);

    const prs = await fetchOpenPRs('owner', 'repo', 'token');

    expect(prs.map((pr) => pr.authorType)).toEqual(['human', 'bot', 'external']);
    await expect(fetchOpenPRs('owner', 'repo', 'token')).rejects.toThrow(
      'GitHub API error 401: bad credentials'
    );
  });
});

describe('validateToken', () => {
  it('returns login for valid tokens and null otherwise', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ login: 'k-dot-greyz' }),
        })
        .mockResolvedValueOnce({ ok: false })
    );

    await expect(validateToken('good-token')).resolves.toBe('k-dot-greyz');
    await expect(validateToken('bad-token')).resolves.toBeNull();
  });
});

describe('closePR', () => {
  it('percent-encodes branch refs when deleting heads', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        return {
          ok: true,
          json: async () => ({ head: { ref: 'greyzxc/weird branch#1' } }),
        };
      }
      if (init?.method === 'DELETE') {
        expect(url).toContain(
          encodeURIComponent('greyzxc/weird branch#1')
        );
        return { ok: true };
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    await closePR('owner', 'repo', 55, 'token', true);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('bulkClosePRs', () => {
  it('records closed and failed PR numbers without aborting the batch', async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      const number = Number(_url.split('/').pop());

      if (number === 2) {
        return {
          ok: false,
          status: 403,
          text: async () => 'forbidden',
        };
      }

      return {
        ok: true,
        json: async () => ({
          head: { ref: `branch-${number}` },
          ...(body ? { state: body.state } : {}),
        }),
      };
    });

    vi.stubGlobal('fetch', fetchMock);

    const resultPromise = bulkClosePRs('owner', 'repo', [1, 2, 3], 'token');
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.closed).toEqual([1, 3]);
    expect(result.failed).toEqual([
      { number: 2, error: 'Failed to close PR #2: 403 forbidden' },
    ]);
  });
});

describe('fetchPRs', () => {
  it('fetches and paginates PRs using GraphQL and reports progress', async () => {
    vi.useFakeTimers();

    const page1Nodes = Array.from({ length: 100 }, (_, i) => ({
      number: i + 1,
      title: `PR ${i + 1}`,
      state: 'OPEN',
      draft: false,
      createdAt: '2026-06-01T12:00:00Z',
      updatedAt: '2026-06-02T12:00:00Z',
      url: `https://github.com/o/r/pull/${i + 1}`,
      headRefName: 'feat/test',
      mergeable: 'MERGEABLE',
      reviewDecision: 'APPROVED',
      additions: 10,
      deletions: 5,
      author: {
        login: 'k-dot-greyz',
        __typename: 'User',
      },
      comments: {
        totalCount: 2,
      },
      labels: {
        nodes: [],
      },
      headRef: {
        target: {
          statusCheckRollup: {
            state: 'SUCCESS',
          },
        },
      },
    }));

    const page2Nodes = [{
      number: 101,
      title: 'PR 101',
      state: 'OPEN',
      draft: false,
      createdAt: '2026-06-01T12:00:00Z',
      updatedAt: '2026-06-02T12:00:00Z',
      url: 'https://github.com/o/r/pull/101',
      headRefName: 'feat/test',
      mergeable: 'MERGEABLE',
      reviewDecision: null,
      additions: 5,
      deletions: 0,
      author: {
        login: 'dependabot[bot]',
        __typename: 'Bot',
      },
      comments: {
        totalCount: 0,
      },
      labels: {
        nodes: [],
      },
      headRef: null,
    }];

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            repository: {
              pullRequests: {
                pageInfo: {
                  hasNextPage: true,
                  endCursor: 'cursor-100',
                },
                totalCount: 101,
                nodes: page1Nodes,
              },
            },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            repository: {
              pullRequests: {
                pageInfo: {
                  hasNextPage: false,
                  endCursor: null,
                },
                totalCount: 101,
                nodes: page2Nodes,
              },
            },
          },
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const progress: Array<[number, number]> = [];
    const resultPromise = fetchPRs('o', 'r', 'token', {
      onProgress: (loaded, total) => {
        progress.push([loaded, total]);
      },
    });

    await vi.runAllTimersAsync();
    const prs = await resultPromise;

    expect(prs).toHaveLength(101);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(progress[0]).toEqual([100, 101]);
    expect(progress[1]).toEqual([101, 101]);
    expect(prs[0].checksStatus).toBe('success');
    expect(prs[100].checksStatus).toBe('none');
    expect(prs[100].authorType).toBe('bot');
  });

  it('throws on GraphQL errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          errors: [{ message: 'Something went wrong' }],
        }),
      })
    );

    await expect(fetchPRs('o', 'r', 'token')).rejects.toThrow(
      'GitHub GraphQL API error: [{"message":"Something went wrong"}]'
    );
  });
});

describe('fetchPRDetail', () => {
  it('fetches and maps PR detail correctly', async () => {
    const rawDetail = {
      number: 42,
      title: 'OAuth integration',
      body: 'Adds oauth support',
      state: 'OPEN',
      draft: false,
      createdAt: '2026-06-01T12:00:00Z',
      updatedAt: '2026-06-02T12:00:00Z',
      url: 'https://github.com/o/r/pull/42',
      headRefName: 'feat/oauth',
      baseRefName: 'main',
      additions: 100,
      deletions: 20,
      changedFiles: 5,
      mergeable: 'MERGEABLE',
      reviewDecision: 'APPROVED',
      author: {
        login: 'k-dot-greyz',
        avatarUrl: 'https://avatar.com/k-dot-greyz',
      },
      commits: { nodes: [] },
      files: { nodes: [] },
      reviews: { nodes: [] },
      closingIssuesReferences: { nodes: [] },
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            repository: {
              pullRequest: rawDetail,
            },
          },
        }),
      })
    );

    const result = await fetchPRDetail('o', 'r', 42, 'token');
    expect(result.number).toBe(42);
    expect(result.title).toBe('OAuth integration');
    expect(result.author).toBe('k-dot-greyz');
  });

  it('throws on not found', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            repository: {
              pullRequest: null,
            },
          },
        }),
      })
    );

    await expect(fetchPRDetail('o', 'r', 42, 'token')).rejects.toThrow(
      'PR #42 not found'
    );
  });
});

