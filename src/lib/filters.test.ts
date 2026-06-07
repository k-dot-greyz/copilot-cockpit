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
});
