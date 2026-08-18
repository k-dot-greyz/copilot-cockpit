/**
 * Dex card pipe: joint entities → DexAssetCard for asset pipeline indexing.
 */

import type { DexAssetCard } from '../entities/dex-card';
import type { TriageViewEntity } from '../entities/triage-view';

export interface DexCardTemplate {
  module_id: string;
  dex_type: DexAssetCard['dex_type'];
  tags: string[];
  depends_on?: string[];
  acceptance?: string[];
  links?: DexAssetCard['links'];
}

/**
 * Emit a dex asset card from a triage view snapshot.
 * Idempotent: same TriageViewEntity + template → same card shape.
 */
export function toDexCard(
  view: TriageViewEntity,
  template: DexCardTemplate
): DexAssetCard {
  const dexId = `0x7D:0x11:${template.module_id}`;

  return {
    dex_id: dexId,
    dex_type: template.dex_type,
    status: 'active',
    tags: [...template.tags, 'cockpit', 'triage'],
    title: `Triage snapshot — ${view.owner}/${view.repo}`,
    description: `${view.stats.total} open PRs across ${Object.keys(view.categories).length} lanes`,
    module_id: template.module_id,
    depends_on: template.depends_on ?? [],
    inputs: ['TriageViewEntity'],
    outputs: ['DexAssetCard'],
    acceptance: template.acceptance ?? [
      'Card dex_id is stable for same module_id',
      'Stats match source TriageViewEntity',
    ],
    links: template.links ?? [
      {
        rel: 'parent',
        href: 'dex-entry.md',
        label: 'Copilot Cockpit 0x7D:0x10',
      },
    ],
    metadata: {
      owner: view.owner,
      repo: view.repo,
      generatedAt: view.generatedAt,
      stats: view.stats,
      laneCounts: Object.fromEntries(
        Object.entries(view.categories).map(([lane, prs]) => [lane, prs.length])
      ),
    },
  };
}
