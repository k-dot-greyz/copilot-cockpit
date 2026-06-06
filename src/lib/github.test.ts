import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  bulkClosePRs,
  fetchOpenPRs,
  validateToken,
} from './github';
import { makeApiPR } from './fixtures/pr';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('fetchOpenPRs', () => {
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
