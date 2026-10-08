import { describe, expect, it } from 'vitest';
import { makePR } from '../fixtures/pr';
import { searchPalette } from './palette';

const actions = [
  { id: 'refresh', title: 'Refresh PRs', kind: 'refresh', confirm: false },
  { id: 'nuke-flood', title: 'Nuke flood PRs', kind: 'nuke', confirm: true },
  { id: 'close-selected', title: 'Close selected PRs', kind: 'close', confirm: true },
];

const prs = [
  makePR({ number: 42, title: 'fix(dex): hydrate cards', author: 'k-dot-greyz' }),
  makePR({ number: 7, title: 'test(security): harness', author: 'copilot[bot]', authorType: 'bot' }),
];

describe('searchPalette', () => {
  it('lists actions first when the query is empty', () => {
    const items = searchPalette('', prs, actions);
    expect(items.filter((i) => i.kind === 'action').map((i) => i.id)).toEqual([
      'refresh',
      'nuke-flood',
      'close-selected',
    ]);
    expect(items.some((i) => i.kind === 'pr' && i.prNumber === 42)).toBe(true);
  });

  it('matches PRs by number, title, author, or branch', () => {
    expect(searchPalette('#42', prs, actions).map((i) => i.prNumber)).toContain(42);
    expect(searchPalette('hydrate', prs, actions).map((i) => i.prNumber)).toContain(42);
    expect(searchPalette('copilot', prs, actions).map((i) => i.prNumber)).toContain(7);
    expect(searchPalette('feature-branch', prs, actions).length).toBeGreaterThan(0);
  });

  it('matches actions by title even when PRs also match', () => {
    const items = searchPalette('nuke', prs, actions);
    expect(items[0]).toMatchObject({ id: 'nuke-flood', kind: 'action' });
  });
});
