import type { DexAssetCard } from '../../entities/dex-card';

export interface OpenPRSnapshot {
  number: number;
  title: string;
  branch: string;
  baseBranch: string;
  url: string;
  mergeRisk: 'low' | 'medium' | 'high';
}

/**
 * @stub MOD-REP-MGMT-REVIEW
 * Hydrate open PR list into dex-review cards for pipeline indexing
 */
export function hydratePRReviewCards(prs: OpenPRSnapshot[]): DexAssetCard[] {
  return prs.map((pr) => ({
    dex_id: `0x7D:0x12:PR-${pr.number}`,
    dex_type: 'task',
    status: 'planning',
    tags: ['rep-mgmt', 'review', `risk-${pr.mergeRisk}`],
    title: `Review PR #${pr.number}: ${pr.title}`,
    description: `${pr.branch} → ${pr.baseBranch}`,
    module_id: 'MOD-REP-MGMT-REVIEW',
    depends_on: [],
    inputs: ['OpenPRSnapshot'],
    outputs: ['DexAssetCard'],
    acceptance: ['Merge risk assessed', 'Entity conflicts documented'],
    links: [{ rel: 'pr', href: pr.url, label: `PR #${pr.number}` }],
    metadata: { mergeRisk: pr.mergeRisk, branch: pr.branch },
  }));
}
