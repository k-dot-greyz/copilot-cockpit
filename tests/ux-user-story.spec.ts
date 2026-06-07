/**
 * UX user-story coverage for COCKPIT-TRIAGE-001 (tasks.md).
 * Stories map to maintainer flows without a live PAT or GitHub API.
 */
import { expect, test } from '@playwright/test';
import { shouldHandleRefreshShortcut } from '../src/lib/keyboard-guards';
import {
  categorizePRs,
  computeStats,
  extractIssueRefs,
  findDuplicates,
} from '../src/lib/triage';
import { makePR } from '../src/lib/fixtures/pr';

test.describe('Story: maintainer connects PAT and loads open PRs', () => {
  test('categorization separates human-ready vs bot flood lanes', () => {
    const flood = Array.from({ length: 10 }, (_, i) =>
      makePR({
        number: i + 1,
        headRefName: `greyzxc/issue-resolution-${(i + 1).toString(16).padStart(4, '0')}`,
        authorType: 'bot',
      })
    );
    const human = makePR({
      number: 99,
      authorType: 'human',
      isDraft: false,
    });

    const categories = categorizePRs([...flood, human]);
    expect(categories['bot-flood']).toHaveLength(10);
    expect(categories['human-ready']).toHaveLength(1);
    expect(computeStats([...flood, human]).floodCount).toBe(10);
  });
});

test.describe('Story: maintainer triages duplicate bot PRs before nuke', () => {
  test('duplicate titles surface for manual review', () => {
    const dupes = findDuplicates([
      makePR({ number: 1, title: 'test(coverage): shield' }),
      makePR({ number: 2, title: 'test(coverage): shield' }),
      makePR({ number: 3, title: 'unique' }),
    ]);

    expect(dupes).toHaveLength(1);
    expect(dupes[0].count).toBe(2);
  });

  test('issue refs extracted from titles for flood context', () => {
    expect(extractIssueRefs('fix(dex): closes #526 and #527')).toEqual([
      526, 527,
    ]);
  });
});

test.describe('Story: maintainer refreshes dashboard during triage', () => {
  test('keyboard refresh allowed when idle', () => {
    expect(
      shouldHandleRefreshShortcut('r', null, {
        isClosing: false,
        loading: false,
      })
    ).toBe(true);
  });
});
