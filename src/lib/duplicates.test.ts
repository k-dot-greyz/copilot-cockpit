import { describe, expect, it } from 'vitest';
import { makePR } from './fixtures/pr';
import { findDuplicates } from './triage';
import { numbersToCloseKeepingOldest } from './duplicates';

describe('numbersToCloseKeepingOldest', () => {
  it('selects every duplicate copy except the oldest PR in each cluster', () => {
    const prs = [
      makePR({ number: 1, title: 'same', createdAt: '2026-01-01T00:00:00Z' }),
      makePR({ number: 2, title: 'same', createdAt: '2026-01-02T00:00:00Z' }),
      makePR({ number: 3, title: 'same', createdAt: '2026-01-03T00:00:00Z' }),
      makePR({ number: 4, title: 'unique', createdAt: '2026-01-04T00:00:00Z' }),
    ];
    const copies = numbersToCloseKeepingOldest(findDuplicates(prs));
    expect(copies.sort()).toEqual([2, 3]);
  });

  it('returns empty when there are no duplicate clusters', () => {
    expect(
      numbersToCloseKeepingOldest(
        findDuplicates([makePR({ number: 1, title: 'a' }), makePR({ number: 2, title: 'b' })])
      )
    ).toEqual([]);
  });
});
