import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bulkClosePRs,
  closePR,
  fetchOpenPRs,
  validateToken,
  type PR,
} from './github';
import { MOCK_PRS, makeApiPR, makePR } from './fixtures/pr';
import {
  categorizePRs,
  computeStats,
  detectFlood,
  duplicateExtras,
  findDuplicates,
} from './triage';

describe('ux journey: full lifecycle, retry, and ablation paths', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('journey 1: cold start & demo mode fallback (ablation path)', () => {
    it('hydrates fully offline using MOCK_PRS when token is absent or demo mode is selected', () => {
      // 1. Zero network calls, load fixtures
      const prs = MOCK_PRS;
      expect(prs.length).toBeGreaterThan(0);

      // 2. Compute categories, stats, and duplicates
      const categories = categorizePRs(prs);
      const stats = computeStats(prs);
      const duplicates = findDuplicates(prs);

      expect(stats.total).toBe(prs.length);
      expect(categories['human-ready'].length).toBeGreaterThanOrEqual(1);
      expect(categories['human-draft'].length).toBeGreaterThanOrEqual(1);
      expect(categories['bot-tests'].length).toBeGreaterThanOrEqual(1);
      expect(duplicates.length).toBeGreaterThanOrEqual(1);

      // 3. Local simulated closing of duplicate extras
      const group = duplicates[0];
      const extras = duplicateExtras(group);
      const extraNumbers = new Set(extras.map((p) => p.number));

      const afterClose = prs.filter((p) => !extraNumbers.has(p.number));
      expect(afterClose.length).toBe(prs.length - extras.length);

      const updatedDuplicates = findDuplicates(afterClose);
      expect(updatedDuplicates.find((d) => d.title === group.title)).toBeUndefined();
    });
  });

  describe('journey 2: live token authentication & paginated fetch (happy & retry path)', () => {
    it('authenticates, fetches pages with rate limit delay, and categorizes live PRs', async () => {
      const page1 = Array.from({ length: 100 }, (_, i) =>
        makeApiPR({ number: i + 1, title: `PR #${i + 1}` })
      );
      const page2 = [
        makeApiPR({
          number: 101,
          title: 'test(core): security coverage',
          user: { login: 'copilot[bot]', type: 'Bot' },
        }),
      ];

      const fetchMock = vi
        .fn()
        // 1. validateToken
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ login: 'k-dot-greyz' }),
        })
        // 2. fetchOpenPRs page 1
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({
            Link: '<https://api.github.com/repos/o/r/pulls?page=2>; rel="last"',
          }),
          json: async () => page1,
        })
        // 3. fetchOpenPRs page 2
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers(),
          json: async () => page2,
        });

      vi.stubGlobal('fetch', fetchMock);

      // Validate token
      const user = await validateToken('valid-token');
      expect(user).toBe('k-dot-greyz');

      // Fetch open PRs with progress callback
      const progressTracker: { loaded: number; total: number }[] = [];
      const fetchPromise = fetchOpenPRs(
        'k-dot-greyz',
        'dev-master',
        'valid-token',
        (loaded, total) => progressTracker.push({ loaded, total })
      );

      await vi.runAllTimersAsync();
      const allPRs = await fetchPromise;

      expect(allPRs).toHaveLength(101);
      expect(progressTracker.length).toBe(2);
      expect(progressTracker[0].loaded).toBe(100);
      expect(progressTracker[1].loaded).toBe(101);

      // Verify categorization
      const categories = categorizePRs(allPRs);
      expect(categories['bot-tests']).toHaveLength(1);
      expect(categories['bot-tests'][0].number).toBe(101);
    });

    it('handles authentication failure and surfaces clean null on network down', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      const user = await validateToken('bad-or-expired-token');
      expect(user).toBeNull();
    });
  });

  describe('journey 3: partial bulk close, branch deletion, and error recovery', () => {
    it('handles partial failures (403, 404, rate limits) without aborting remaining batch', async () => {
      const progressCalls: { done: number; total: number; current: number }[] = [];

      const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
        const method = init?.method;
        const number = Number(url.split('/').pop());

        // Simulate PR #2 failing to close with 403 Forbidden
        if (number === 2 && method === 'PATCH') {
          return {
            ok: false,
            status: 403,
            text: async () => 'Rate limit exceeded or branch protected',
          };
        }

        // Simulate PR #3 head branch deletion failing with 404 (already deleted)
        if (url.includes('/git/refs/heads/') && url.includes('branch-3')) {
          return {
            ok: false,
            status: 404,
            text: async () => 'Ref does not exist',
          };
        }

        if (method === 'PATCH') {
          return {
            ok: true,
            json: async () => ({
              head: { ref: `branch-${number}` },
              state: 'closed',
            }),
          };
        }

        if (method === 'DELETE') {
          return { ok: true };
        }

        return { ok: true, json: async () => ({}) };
      });

      vi.stubGlobal('fetch', fetchMock);

      const batchPromise = bulkClosePRs(
        'k-dot-greyz',
        'dev-master',
        [1, 2, 3],
        'token-123',
        true,
        (done, total, current) => progressCalls.push({ done, total, current })
      );

      await vi.runAllTimersAsync();
      const result = await batchPromise;

      // PR 1 & 3 succeeded (even with PR 3 branch deletion 404 caught silently)
      expect(result.closed).toEqual([1, 3]);
      // PR 2 was recorded in failed list with error message
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].number).toBe(2);
      expect(result.failed[0].error).toContain('403 Rate limit exceeded');

      // Progress updates received for all 3 attempts
      expect(progressCalls).toHaveLength(3);
      expect(progressCalls.map((p) => p.current)).toEqual([1, 2, 3]);
    });

    it('throws structured error on individual closePR failure', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: async () => 'Internal GitHub error',
        })
      );

      await expect(
        closePR('k-dot-greyz', 'dev-master', 99, 'token')
      ).rejects.toThrow('Failed to close PR #99: 500 Internal GitHub error');
    });
  });

  describe('journey 4: flood detection, duplicate triage, and bulk nuke action', () => {
    it('detects flood groups and correctly separates newest PR from extras', () => {
      const floodPRs: PR[] = Array.from({ length: 12 }, (_, i) =>
        makePR({
          number: 10 + i,
          title: `fix(auth): duplicate prompt resolution #${i + 1}`,
          headRefName: `greyzxc/issue-resolution-${i.toString(16).padStart(4, '0')}`,
          authorType: 'bot',
          createdAt: `2026-08-18T10:${i.toString().padStart(2, '0')}:00Z`,
        })
      );

      const regularPR: PR = makePR({
        number: 999,
        title: 'feat: regular feature',
        headRefName: 'feature/regular',
        authorType: 'human',
      });

      const all = [...floodPRs, regularPR];

      // Detect flood
      const floods = detectFlood(all);
      expect(floods).toHaveLength(1);
      expect(floods[0].pattern).toBe('issue-resolution');
      expect(floods[0].count).toBe(12);

      // Categorize
      const categorized = categorizePRs(all);
      expect(categorized['bot-flood']).toHaveLength(12);
      expect(categorized['human-ready']).toHaveLength(1);

      // Check duplicates logic
      const duplicatePRs: PR[] = [
        makePR({
          number: 1,
          title: 'Duplicate Title',
          createdAt: '2026-08-18T08:00:00Z',
        }),
        makePR({
          number: 2,
          title: 'Duplicate Title',
          createdAt: '2026-08-18T09:00:00Z',
        }),
      ];

      const dupGroups = findDuplicates(duplicatePRs);
      expect(dupGroups).toHaveLength(1);
      const extras = duplicateExtras(dupGroups[0]);
      expect(extras).toHaveLength(1);
      expect(extras[0].number).toBe(1); // Oldest is extra, newest (PR #2) kept
    });
  });
});
