import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateToken, fetchOpenPRs, bulkClosePRs } from './github';
import { categorizePRs, computeStats, detectFlood } from './triage';
import { makeApiPR } from './fixtures/pr';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('PR Triage Happy Path (COCKPIT-TRIAGE-001)', () => {
  it('executes the complete happy path flow end-to-end', async () => {
    vi.useFakeTimers();

    // 1. Connect & Validate Token
    const token = 'ghp_valid_token_secret_12345';
    const validateFetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ login: 'k-dot-greyz' }),
    });

    vi.stubGlobal('fetch', validateFetchMock);
    const username = await validateToken(token);
    expect(username).toBe('k-dot-greyz');
    expect(validateFetchMock).toHaveBeenCalledWith('https://api.github.com/user', expect.any(Object));

    // 2. Fetch Open PRs (Automatic)
    // We mock a repository containing:
    // - 12 Bot Flood PRs (greyzxc/issue-resolution-xxxx)
    // - 1 Human Ready PR
    // - 1 Human Draft PR
    // - 1 External PR
    const floodApiPRs = Array.from({ length: 12 }, (_, i) =>
      makeApiPR({
        number: i + 1,
        title: `Resolve issue #${100 + i}`,
        user: { login: 'copilot[bot]', type: 'Bot' },
        head: { ref: `greyzxc/issue-resolution-${(i + 1).toString(16).padStart(4, '0')}` },
        created_at: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      })
    );

    const humanReadyApiPR = makeApiPR({
      number: 100,
      title: 'feat(core): implement polymorphic state hydration',
      user: { login: 'k-dot-greyz', type: 'User' },
      head: { ref: 'feat/polymorphic-hydration' },
      created_at: '2026-02-01T12:00:00Z',
      draft: false,
    });

    const humanDraftApiPR = makeApiPR({
      number: 101,
      title: 'work(triage): draft duplicate detection UI',
      user: { login: 'k-dot-greyz', type: 'User' },
      head: { ref: 'work/duplicate-ui' },
      created_at: '2026-02-02T12:00:00Z',
      draft: true,
    });

    const externalApiPR = makeApiPR({
      number: 102,
      title: 'docs: fix typo in README',
      user: { login: 'contributor', type: 'User' },
      head: { ref: 'patch-1' },
      created_at: '2026-02-03T12:00:00Z',
    });

    const mockApiPRs = [...floodApiPRs, humanReadyApiPR, humanDraftApiPR, externalApiPR];

    const fetchPRsMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      headers: new Headers(),
      json: async () => mockApiPRs,
    });

    vi.stubGlobal('fetch', fetchPRsMock);

    const prs = await fetchOpenPRs('k-dot-greyz', 'dev-master', token);
    expect(prs).toHaveLength(15);

    // 3. Scan Stat Bar & Categorize Lanes
    const stats = computeStats(prs);
    expect(stats.total).toBe(15);
    expect(stats.drafts).toBe(1);
    expect(stats.ready).toBe(14);
    expect(stats.byAuthorType.human).toBe(2);
    expect(stats.byAuthorType.bot).toBe(12);
    expect(stats.byAuthorType.external).toBe(1);
    expect(stats.floodCount).toBe(12);

    const categorized = categorizePRs(prs);
    expect(categorized['human-ready']).toHaveLength(1);
    expect(categorized['human-draft']).toHaveLength(1);
    expect(categorized['bot-flood']).toHaveLength(12);
    expect(categorized['external']).toHaveLength(1);

    // 4. Flood Path: Detect Flood & Bulk Close (Nuke)
    const floods = detectFlood(prs);
    expect(floods).toHaveLength(1);
    expect(floods[0].pattern).toBe('issue-resolution');
    expect(floods[0].count).toBe(12);

    const floodPRNumbers = floods[0].prs.map((p) => p.number);
    expect(floodPRNumbers).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));

    // Mock closePR PATCH and DELETE calls for 12 PRs
    const closeFetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        const number = Number(url.split('/').pop());
        return {
          ok: true,
          json: async () => ({ head: { ref: `greyzxc/issue-resolution-${number.toString(16).padStart(4, '0')}` } }),
        };
      }
      if (init?.method === 'DELETE') {
        return { ok: true };
      }
      throw new Error(`unexpected fetch call: ${url}`);
    });

    vi.stubGlobal('fetch', closeFetchMock);

    const nukePromise = bulkClosePRs('k-dot-greyz', 'dev-master', floodPRNumbers, token, true);
    await vi.runAllTimersAsync();
    const closeResult = await nukePromise;

    expect(closeResult.closed).toHaveLength(12);
    expect(closeResult.failed).toHaveLength(0);

    // 5. Post-Nuke State (Filter and Re-evaluate)
    const remainingPRs = prs.filter((p) => !closeResult.closed.includes(p.number));
    expect(remainingPRs).toHaveLength(3);

    const postStats = computeStats(remainingPRs);
    expect(postStats.total).toBe(3);
    expect(postStats.floodCount).toBe(0);

    const postCategorized = categorizePRs(remainingPRs);
    expect(postCategorized['bot-flood']).toHaveLength(0);
    expect(postCategorized['human-ready']).toHaveLength(1);
    expect(postCategorized['human-draft']).toHaveLength(1);
    expect(postCategorized['external']).toHaveLength(1);
  });
});
