import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  categorizePRs,
  computeStats,
  detectFlood,
  extractIssueRefs,
  duplicateExtras,
  findDuplicates,
  timeAgo,
} from './triage';
import { makePR } from './fixtures/pr';

describe('extractIssueRefs', () => {
  it('extracts all #number references from a title', () => {
    expect(extractIssueRefs('Fix #12 and #34 for #12')).toEqual([12, 34, 12]);
  });

  it('returns an empty array when no issue refs are present', () => {
    expect(extractIssueRefs('No refs here')).toEqual([]);
  });
});

describe('detectFlood', () => {
  it('groups greyzxc/<prefix>-<hash> branches and enforces minCount', () => {
    const prs = Array.from({ length: 12 }, (_, i) =>
      makePR({
        number: i + 1,
        title: `Resolve #${100 + i}`,
        headRefName: `greyzxc/issue-resolution-${(i + 1).toString(16).padStart(4, '0')}`,
        createdAt: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
        authorType: 'bot',
      })
    );

    const floods = detectFlood(prs, 10);

    expect(floods).toHaveLength(1);
    expect(floods[0].pattern).toBe('issue-resolution');
    expect(floods[0].count).toBe(12);
    expect(floods[0].uniqueIssues).toBe(12);
    expect(floods[0].dateRange).toEqual({
      oldest: '2026-01-01T00:00:00Z',
      newest: '2026-01-12T00:00:00Z',
    });
  });

  it('ignores branches that do not match the flood prefix pattern', () => {
    const prs = [
      makePR({ number: 1, headRefName: 'greyzxc/issue-resolution' }),
      makePR({ number: 2, headRefName: 'feat/not-a-flood' }),
    ];

    expect(detectFlood(prs, 1)).toEqual([]);
  });

  it('detects floods for any namespace prefix, not only greyzxc', () => {
    const prs = Array.from({ length: 10 }, (_, i) =>
      makePR({
        number: i + 1,
        title: `Auto #${200 + i}`,
        headRefName: `cursor-agent/regression-shield-${(i + 1).toString(16).padStart(4, '0')}`,
        authorType: 'bot',
      })
    );

    const floods = detectFlood(prs, 10);

    expect(floods).toHaveLength(1);
    expect(floods[0].pattern).toBe('regression-shield');
    expect(floods[0].count).toBe(10);
  });
});

describe('categorizePRs', () => {
  it('routes flood, human, bot-test, bot-other, and external PRs', () => {
    const floodPRs = Array.from({ length: 10 }, (_, i) =>
      makePR({
        number: i + 1,
        title: `Flood #${i}`,
        headRefName: `greyzxc/regression-shield-${(i + 1).toString(16).padStart(4, '0')}`,
        authorType: 'bot',
        createdAt: `2026-01-${String(10 - i).padStart(2, '0')}T00:00:00Z`,
      })
    );

    const categorized = categorizePRs([
      ...floodPRs,
      makePR({
        number: 100,
        authorType: 'human',
        isDraft: true,
        createdAt: '2026-02-01T00:00:00Z',
      }),
      makePR({
        number: 101,
        authorType: 'human',
        isDraft: false,
        createdAt: '2026-02-02T00:00:00Z',
      }),
      makePR({
        number: 102,
        authorType: 'bot',
        title: 'test(coverage): shield',
        headRefName: 'bot/coverage-run',
        createdAt: '2026-02-03T00:00:00Z',
      }),
      makePR({
        number: 103,
        authorType: 'bot',
        title: 'chore: noop',
        headRefName: 'bot/misc',
        createdAt: '2026-02-04T00:00:00Z',
      }),
      makePR({
        number: 104,
        authorType: 'external',
        author: 'random-contributor',
        createdAt: '2026-02-05T00:00:00Z',
      }),
    ]);

    expect(categorized['bot-flood']).toHaveLength(10);
    expect(categorized['human-draft'].map((p) => p.number)).toEqual([100]);
    expect(categorized['human-ready'].map((p) => p.number)).toEqual([101]);
    expect(categorized['bot-tests'].map((p) => p.number)).toEqual([102]);
    expect(categorized['bot-other'].map((p) => p.number)).toEqual([103]);
    expect(categorized.external.map((p) => p.number)).toEqual([104]);
    expect(categorized['human-ready'][0].createdAt).toBe('2026-02-02T00:00:00Z');
  });

  it('routes bot PRs with security, coverage, or ux-security branch names to bot-tests', () => {
    const categorized = categorizePRs([
      makePR({
        number: 1,
        authorType: 'bot',
        title: 'chore: security scan',
        headRefName: 'bot/ux-security-a1b2',
      }),
      makePR({
        number: 2,
        authorType: 'bot',
        title: 'chore: coverage run',
        headRefName: 'bot/coverage-report',
      }),
      makePR({
        number: 3,
        authorType: 'bot',
        title: 'chore: audit',
        headRefName: 'bot/security-patch',
      }),
    ]);

    expect(categorized['bot-tests'].map((p) => p.number)).toEqual([1, 2, 3]);
    expect(categorized['bot-other']).toHaveLength(0);
  });
});

describe('computeStats', () => {
  it('aggregates totals, author mix, and flood membership', () => {
    const floodPRs = Array.from({ length: 10 }, (_, i) =>
      makePR({
        number: i + 1,
        headRefName: `greyzxc/issue-resolution-${(i + 1).toString(16).padStart(4, '0')}`,
        authorType: 'bot',
        createdAt: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      })
    );

    const stats = computeStats([
      ...floodPRs,
      makePR({
        number: 50,
        authorType: 'human',
        isDraft: true,
        createdAt: '2026-02-01T00:00:00Z',
      }),
      makePR({
        number: 51,
        authorType: 'external',
        isDraft: false,
        createdAt: '2026-03-01T00:00:00Z',
      }),
    ]);

    expect(stats).toEqual({
      total: 12,
      drafts: 1,
      ready: 11,
      byAuthorType: { human: 1, bot: 10, external: 1 },
      floodCount: 10,
      oldestPR: '2026-01-01T00:00:00Z',
      newestPR: '2026-03-01T00:00:00Z',
    });
  });
});

describe('post-bulk-close state', () => {
  it('keeps categories, stats, and floods aligned on the same remaining snapshot', () => {
    const floodPRs = Array.from({ length: 10 }, (_, i) =>
      makePR({
        number: i + 1,
        title: 'chore: flood bot',
        headRefName: `greyzxc/issue-resolution-${(i + 1).toString(16).padStart(4, '0')}`,
        authorType: 'bot',
        createdAt: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
      })
    );
    const humanPR = makePR({
      number: 100,
      authorType: 'human',
      isDraft: false,
      createdAt: '2026-02-01T00:00:00Z',
    });
    const prs = [...floodPRs, humanPR];

    expect(computeStats(prs).floodCount).toBe(10);

    const remaining = prs.filter((p) => ![1, 2, 3].includes(p.number));
    const categories = categorizePRs(remaining);
    const stats = computeStats(remaining);
    const floods = detectFlood(remaining);

    expect(remaining).toHaveLength(8);
    expect(stats.total).toBe(remaining.length);
    expect(stats.floodCount).toBe(0);
    expect(floods).toEqual([]);
    expect(categories['bot-flood']).toHaveLength(0);

    const categorizedTotal = (
      Object.keys(categories) as Array<keyof typeof categories>
    ).reduce((sum, key) => sum + categories[key].length, 0);
    expect(categorizedTotal).toBe(remaining.length);
  });
});

describe('findDuplicates', () => {
  it('returns only title groups with more than one PR, sorted by count', () => {
    const duplicates = findDuplicates([
      makePR({ number: 1, title: 'Duplicate title' }),
      makePR({ number: 2, title: 'Duplicate title' }),
      makePR({ number: 3, title: 'Duplicate title' }),
      makePR({ number: 4, title: 'Unique title' }),
    ]);

    expect(duplicates).toEqual([
      {
        title: 'Duplicate title',
        count: 3,
        prs: expect.arrayContaining([
          expect.objectContaining({ number: 1 }),
          expect.objectContaining({ number: 2 }),
          expect.objectContaining({ number: 3 }),
        ]),
      },
    ]);
  });
});

describe('duplicateExtras', () => {
  it('keeps the newest PR and returns older duplicates', () => {
    const group = {
      title: 'Duplicate title',
      count: 3,
      prs: [
        makePR({ number: 1, createdAt: '2026-01-01T00:00:00Z' }),
        makePR({ number: 2, createdAt: '2026-03-01T00:00:00Z' }),
        makePR({ number: 3, createdAt: '2026-02-01T00:00:00Z' }),
      ],
    };

    expect(duplicateExtras(group).map((p) => p.number)).toEqual([3, 1]);
  });
});

describe('timeAgo', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats relative timestamps deterministically', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-06T12:00:00Z'));

    expect(timeAgo('2026-06-06T11:59:30Z')).toBe('just now');
    expect(timeAgo('2026-06-06T11:30:00Z')).toBe('30m ago');
    expect(timeAgo('2026-06-06T08:00:00Z')).toBe('4h ago');
    expect(timeAgo('2026-06-03T12:00:00Z')).toBe('3d ago');
  });
});
