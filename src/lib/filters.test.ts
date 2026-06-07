import { describe, expect, it } from 'vitest';
import { filterPRs, getUniqueLabels, type FilterCriteria } from './filters';
import { makePR } from './fixtures/pr';

describe('filterPRs', () => {
  const mockPRs = [
    makePR({
      number: 1,
      title: 'Fix auth bug',
      author: 'k-dot-greyz',
      authorType: 'human',
      headRefName: 'fix/auth',
      isDraft: false,
      reviewDecision: 'APPROVED',
      checksStatus: 'success',
      state: 'OPEN',
      labels: ['bug', 'high-priority'],
    }),
    makePR({
      number: 2,
      title: 'Update dependencies',
      author: 'dependabot[bot]',
      authorType: 'bot',
      headRefName: 'deps/update',
      isDraft: false,
      reviewDecision: null,
      checksStatus: 'failure',
      state: 'OPEN',
      labels: ['dependencies'],
    }),
    makePR({
      number: 3,
      title: 'Add dark mode',
      author: 'stranger',
      authorType: 'external',
      headRefName: 'feat/dark-mode',
      isDraft: true,
      reviewDecision: 'CHANGES_REQUESTED',
      checksStatus: 'pending',
      state: 'OPEN',
      labels: ['feature', 'ui'],
    }),
    makePR({
      number: 4,
      title: 'Refactor database',
      author: 'k-dot-greyz',
      authorType: 'human',
      headRefName: 'refactor/db',
      isDraft: false,
      reviewDecision: 'REVIEW_REQUIRED',
      checksStatus: 'none',
      state: 'CLOSED',
      labels: ['refactor'],
    }),
  ];

  it('returns all PRs when criteria is empty', () => {
    const result = filterPRs(mockPRs, {});
    expect(result).toHaveLength(4);
  });

  it('filters by state', () => {
    expect(filterPRs(mockPRs, { state: 'OPEN' })).toHaveLength(3);
    expect(filterPRs(mockPRs, { state: 'CLOSED' })).toHaveLength(1);
    expect(filterPRs(mockPRs, { state: 'ALL' })).toHaveLength(4);
  });

  it('filters by authorType', () => {
    expect(filterPRs(mockPRs, { authorType: 'human' })).toHaveLength(2);
    expect(filterPRs(mockPRs, { authorType: 'bot' })).toHaveLength(1);
    expect(filterPRs(mockPRs, { authorType: 'external' })).toHaveLength(1);
  });

  it('filters by label', () => {
    expect(filterPRs(mockPRs, { label: 'bug' })).toHaveLength(1);
    expect(filterPRs(mockPRs, { label: 'dependencies' })).toHaveLength(1);
    expect(filterPRs(mockPRs, { label: 'non-existent' })).toHaveLength(0);
  });

  it('filters by reviewDecision', () => {
    expect(filterPRs(mockPRs, { reviewDecision: 'APPROVED' })).toHaveLength(1);
    expect(filterPRs(mockPRs, { reviewDecision: 'none' })).toHaveLength(1);
    expect(filterPRs(mockPRs, { reviewDecision: 'REVIEW_REQUIRED' })).toHaveLength(1);
  });

  it('filters by checksStatus', () => {
    expect(filterPRs(mockPRs, { checksStatus: 'success' })).toHaveLength(1);
    expect(filterPRs(mockPRs, { checksStatus: 'failure' })).toHaveLength(1);
    expect(filterPRs(mockPRs, { checksStatus: 'none' })).toHaveLength(1);
  });

  it('filters by draft status', () => {
    expect(filterPRs(mockPRs, { isDraft: true })).toHaveLength(1);
    expect(filterPRs(mockPRs, { isDraft: false })).toHaveLength(3);
  });

  it('filters by search query in title, branch, or number', () => {
    expect(filterPRs(mockPRs, { searchQuery: 'auth' })).toHaveLength(1);
    expect(filterPRs(mockPRs, { searchQuery: 'dark-mode' })).toHaveLength(1);
    expect(filterPRs(mockPRs, { searchQuery: '#2' })).toHaveLength(1);
    expect(filterPRs(mockPRs, { searchQuery: '2' })).toHaveLength(1);
    expect(filterPRs(mockPRs, { searchQuery: 'xyz' })).toHaveLength(0);
  });

  it('combines multiple filters correctly', () => {
    const criteria: FilterCriteria = {
      state: 'OPEN',
      authorType: 'human',
      reviewDecision: 'APPROVED',
    };
    const result = filterPRs(mockPRs, criteria);
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(1);
  });
});

describe('getUniqueLabels', () => {
  it('extracts and sorts unique labels', () => {
    const mockPRs = [
      makePR({ number: 1, labels: ['bug', 'ui'] }),
      makePR({ number: 2, labels: ['bug', 'dependencies'] }),
    ];
    expect(getUniqueLabels(mockPRs)).toEqual(['bug', 'dependencies', 'ui']);
  });

  it('returns an empty array when no labels exist', () => {
    const prs = [makePR({ number: 1, labels: [] }), makePR({ number: 2, labels: [] })];
    expect(getUniqueLabels(prs)).toEqual([]);
  });
});

describe('filterPRs — additional edge cases', () => {
  it('filters by MERGED state', () => {
    const prs = [
      makePR({ number: 1, state: 'OPEN' }),
      makePR({ number: 2, state: 'CLOSED' }),
      makePR({ number: 3, state: 'MERGED' }),
    ];
    expect(filterPRs(prs, { state: 'MERGED' })).toHaveLength(1);
    expect(filterPRs(prs, { state: 'MERGED' })[0].number).toBe(3);
  });

  it('ALL state returns all PRs regardless of state', () => {
    const prs = [
      makePR({ number: 1, state: 'OPEN' }),
      makePR({ number: 2, state: 'CLOSED' }),
      makePR({ number: 3, state: 'MERGED' }),
    ];
    expect(filterPRs(prs, { state: 'ALL' })).toHaveLength(3);
  });

  it('searchQuery matches PR number as plain integer string', () => {
    const prs = [
      makePR({ number: 42, title: 'Some PR', headRefName: 'branch-x' }),
      makePR({ number: 99, title: 'Other PR', headRefName: 'branch-y' }),
    ];
    expect(filterPRs(prs, { searchQuery: '42' })).toHaveLength(1);
    expect(filterPRs(prs, { searchQuery: '42' })[0].number).toBe(42);
  });

  it('searchQuery with #number prefix matches by PR number', () => {
    const prs = [
      makePR({ number: 42, title: 'Some PR', headRefName: 'branch-x' }),
    ];
    expect(filterPRs(prs, { searchQuery: '#42' })).toHaveLength(1);
  });

  it('searchQuery is case-insensitive for title matching', () => {
    const prs = [
      makePR({ number: 1, title: 'Fix Auth Bug', headRefName: 'fix/auth' }),
    ];
    expect(filterPRs(prs, { searchQuery: 'AUTH' })).toHaveLength(1);
    expect(filterPRs(prs, { searchQuery: 'auth' })).toHaveLength(1);
  });

  it('whitespace-only searchQuery returns all PRs', () => {
    const prs = [
      makePR({ number: 1, title: 'PR 1' }),
      makePR({ number: 2, title: 'PR 2' }),
    ];
    expect(filterPRs(prs, { searchQuery: '   ' })).toHaveLength(2);
  });

  it('returns empty array when no PRs match combined strict criteria', () => {
    const prs = [
      makePR({ number: 1, authorType: 'bot', isDraft: false, state: 'OPEN' }),
    ];
    const result = filterPRs(prs, {
      authorType: 'human',
      isDraft: true,
      state: 'CLOSED',
    });
    expect(result).toHaveLength(0);
  });

  it('isDraft false filter excludes draft PRs', () => {
    const prs = [
      makePR({ number: 1, isDraft: true }),
      makePR({ number: 2, isDraft: false }),
      makePR({ number: 3, isDraft: false }),
    ];
    const result = filterPRs(prs, { isDraft: false });
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.number)).toEqual([2, 3]);
  });

  it("'all' isDraft value does not filter any PRs", () => {
    const prs = [
      makePR({ number: 1, isDraft: true }),
      makePR({ number: 2, isDraft: false }),
    ];
    expect(filterPRs(prs, { isDraft: 'all' })).toHaveLength(2);
  });
});
