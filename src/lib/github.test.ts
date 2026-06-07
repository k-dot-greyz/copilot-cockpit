import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bulkClosePRs,
  closePR,
  fetchOpenPRs,
  validateToken,
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

  it('produces safe defaults when user field is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => [
          {
            ...makeApiPR({ number: 20 }),
            user: null,
          },
        ],
      })
    );

    const prs = await fetchOpenPRs('o', 'r', 'token');
    expect(prs[0].author).toBe('unknown');
    expect(prs[0].authorType).toBe('external');
  });

  it('produces empty headRefName when head field is missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => [
          {
            ...makeApiPR({ number: 21 }),
            head: null,
          },
        ],
      })
    );

    const prs = await fetchOpenPRs('o', 'r', 'token');
    expect(prs[0].headRefName).toBe('');
  });

  it('coerces non-string title to empty string', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => [
          {
            ...makeApiPR({ number: 22 }),
            title: null,
          },
        ],
      })
    );

    const prs = await fetchOpenPRs('o', 'r', 'token');
    expect(prs[0].title).toBe('');
  });

  it('coerces truthy draft values to boolean true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => [
          {
            ...makeApiPR({ number: 23 }),
            draft: true,
          },
        ],
      })
    );

    const prs = await fetchOpenPRs('o', 'r', 'token');
    expect(prs[0].isDraft).toBe(true);
  });

  it('produces empty createdAt and updatedAt when timestamps are missing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => [
          {
            ...makeApiPR({ number: 24 }),
            created_at: null,
            updated_at: undefined,
          },
        ],
      })
    );

    const prs = await fetchOpenPRs('o', 'r', 'token');
    expect(prs[0].createdAt).toBe('');
    expect(prs[0].updatedAt).toBe('');
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

  it('deletes head branches when deleteBranch is enabled', async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        return {
          ok: true,
          json: async () => ({ head: { ref: 'greyzxc/coverage-deadbeef' } }),
        };
      }

      if (init?.method === 'DELETE') {
        return { ok: true };
      }

      throw new Error(`Unexpected fetch: ${url} ${init?.method ?? 'GET'}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const resultPromise = bulkClosePRs('owner', 'repo', [9], 'token', true);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toEqual({ closed: [9], failed: [] });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/owner/repo/git/refs/heads/greyzxc%2Fcoverage-deadbeef',
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});

describe('closePR', () => {
  it('throws when GitHub rejects the close request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'not found',
      })
    );

    await expect(closePR('owner', 'repo', 99, 'token')).rejects.toThrow(
      'Failed to close PR #99: 404 not found'
    );
  });
});
