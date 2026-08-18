import { describe, expect, it } from 'vitest';
import { hydratePRReviewCards } from './rep-mgmt/pr-hydration-review.stub';
import { STUB_MODULE_IDS } from './index';

describe('stub registry', () => {
  it('lists all follow-up module IDs', () => {
    expect(STUB_MODULE_IDS).toContain('MOD-REP-MGMT-REVIEW');
    expect(STUB_MODULE_IDS).toContain('MOD-QUICKSTART-AGENTIC');
    expect(STUB_MODULE_IDS.length).toBeGreaterThanOrEqual(15);
  });
});

describe('hydratePRReviewCards', () => {
  it('emits dex cards for open PR snapshots', () => {
    const cards = hydratePRReviewCards([
      {
        number: 8,
        title: 'PR read parity',
        branch: 'feat/pr-read-parity',
        baseBranch: 'main',
        url: 'https://github.com/k-dot-greyz/copilot-cockpit/pull/8',
        mergeRisk: 'high',
      },
    ]);

    expect(cards).toHaveLength(1);
    expect(cards[0].dex_id).toBe('0x7D:0x12:PR-8');
    expect(cards[0].tags).toContain('risk-high');
    expect(cards[0].module_id).toBe('MOD-REP-MGMT-REVIEW');
  });
});
