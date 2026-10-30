import { describe, expect, it } from 'vitest';
import { makePR } from '../fixtures/pr';
import type { PRDetail } from '../github';
import { mapPRToTarotSpread, type TarotReviewSpread } from './spread-mapper';

describe('mapPRToTarotSpread', () => {
  it('maps a clean, approved human PR into an upright aether/water divination spread', () => {
    const pr = makePR({
      number: 19,
      title: 'chore(cleanup): extract stickhrpg to standalone repo',
      author: 'k-dot-greyz',
      authorType: 'human',
      headRefName: 'greyzxcursor/cockpit-cleanup-stickhrpg-4f38',
      checksStatus: 'success',
      mergeable: 'MERGEABLE',
      reviewDecision: 'APPROVED',
      isDraft: false,
      additions: 24,
      deletions: 3968,
    });

    const detail: PRDetail = {
      number: 19,
      title: pr.title,
      body: 'Clean extraction of game engine to stickhrpg-dev.',
      state: 'OPEN',
      draft: false,
      createdAt: pr.createdAt,
      updatedAt: pr.updatedAt,
      url: pr.url,
      headRefName: pr.headRefName,
      baseRefName: 'main',
      additions: 24,
      deletions: 3968,
      changedFiles: 35,
      mergeable: 'MERGEABLE',
      reviewDecision: 'APPROVED',
      author: 'k-dot-greyz',
      authorAvatarUrl: '',
      commits: [],
      files: [{ path: 'package.json', additions: 1, deletions: 10 }],
      reviews: [{ author: 'reviewer', state: 'APPROVED', body: 'LGTM', submittedAt: '' }],
      linkedIssues: [{ number: 18, title: 'Extract stickhrpg', url: '' }],
    };

    const spread: TarotReviewSpread = mapPRToTarotSpread(pr, detail);

    expect(spread.spread_id).toBe('tarot-pr-19');
    expect(spread.pr_number).toBe(19);
    expect(spread.orientation).toBe('upright');

    // Card I: Origin
    expect(spread.cards.origin.position).toBe('origin');
    expect(spread.cards.origin.arcana).toBe('The Magician');
    expect(spread.cards.origin.element).toBe('aether');
    expect(spread.cards.origin.is_reversed).toBe(false);
    expect(spread.cards.origin.metrics.author).toBe('k-dot-greyz');

    // Card II: Crucible
    expect(spread.cards.crucible.position).toBe('crucible');
    expect(spread.cards.crucible.is_reversed).toBe(false);
    expect(spread.cards.crucible.metrics.checksStatus).toBe('success');
    expect(spread.cards.crucible.metrics.mergeable).toBe('MERGEABLE');

    // Card III: Oracle
    expect(spread.cards.oracle.position).toBe('oracle');
    expect(spread.cards.oracle.arcana).toBe('Judgment');
    expect(spread.cards.oracle.status).toBe('APPROVED');
    expect(spread.cards.oracle.is_reversed).toBe(false);
    expect(spread.cards.oracle.action?.kind).toBe('merge');

    // Explainer Arcana
    expect(spread.explainer.risk_level).toBe('low');
    expect(spread.explainer.verdict).toMatch(/ready to merge/i);
    expect(spread.explainer.key_files).toContain('package.json');
  });

  it('maps a failing, conflicting PR into a reversed Fire spread with The Tower', () => {
    const pr = makePR({
      number: 88,
      title: 'feat(core): breaking conflicting changes',
      author: 'external-dev',
      authorType: 'external',
      headRefName: 'feature/conflicts',
      checksStatus: 'pending',
      mergeable: 'CONFLICTING',
      reviewDecision: 'CHANGES_REQUESTED',
      isDraft: false,
      additions: 1500,
      deletions: 800,
    });

    const spread = mapPRToTarotSpread(pr);

    expect(spread.orientation).toBe('reversed');
    expect(spread.cards.crucible.arcana).toBe('The Tower');
    expect(spread.cards.crucible.element).toBe('fire');
    expect(spread.cards.crucible.is_reversed).toBe(true);

    expect(spread.cards.oracle.arcana).toBe('Justice');
    expect(spread.cards.oracle.is_reversed).toBe(true);
    expect(spread.cards.oracle.action?.kind).toBe('block');

    expect(spread.explainer.risk_level).toBe('high');
    expect(spread.explainer.verdict).toMatch(/blocked/i);
  });

  it('marks risk as critical when both merge conflict and CI failure are active', () => {
    const pr = makePR({
      number: 89,
      checksStatus: 'failure',
      mergeable: 'CONFLICTING',
    });
    const spread = mapPRToTarotSpread(pr);
    expect(spread.explainer.risk_level).toBe('critical');
  });

  it('maps a bot flood PR into a Void Fool archetype spread', () => {
    const pr = makePR({
      number: 104,
      title: 'Resolve issue #42',
      author: 'copilot[bot]',
      authorType: 'bot',
      headRefName: 'greyzxc/issue-resolution-0068',
      checksStatus: 'none',
      mergeable: 'UNKNOWN',
      reviewDecision: null,
      isDraft: true,
    });

    const spread = mapPRToTarotSpread(pr);

    expect(spread.cards.origin.arcana).toBe('The Fool');
    expect(spread.cards.origin.element).toBe('void');
    expect(spread.cards.origin.is_reversed).toBe(true);
    expect(spread.explainer.risk_level).toBe('moderate');
    expect(spread.cards.oracle.action?.kind).toBe('nuke');
  });

  it('maps bot security coverage into an Electric Emperor archetype', () => {
    const pr = makePR({
      number: 45,
      title: 'test(security): boundary harness',
      author: 'copilot[bot]',
      authorType: 'bot',
      headRefName: 'greyzxcursor/agentic-security-test-coverage-7c3c',
      checksStatus: 'pending',
      mergeable: 'MERGEABLE',
      reviewDecision: null,
      isDraft: false,
    });

    const spread = mapPRToTarotSpread(pr);

    expect(spread.cards.origin.arcana).toBe('The Emperor');
    expect(spread.cards.origin.element).toBe('electric');
    expect(spread.cards.origin.is_reversed).toBe(false);
  });
});
