/**
 * Joint entity: dex asset pipeline card.
 * Emitted by MOD-PIPE-DEX; indexed by dex registry (dex_id).
 */

export interface DexAssetCard {
  dex_id: string;
  dex_type: 'task' | 'tool' | 'entity' | 'pipe';
  status: 'planning' | 'active' | 'blocked' | 'done';
  tags: string[];
  title: string;
  description: string;
  /** Module that owns this card */
  module_id: string;
  /** Other module_ids that must complete first */
  depends_on: string[];
  /** Joint entity types this card reads */
  inputs: string[];
  /** Joint entity types this card writes */
  outputs: string[];
  acceptance: string[];
  links: DexCardLink[];
  metadata: Record<string, unknown>;
}

export interface DexCardLink {
  rel: 'pr' | 'issue' | 'doc' | 'parent';
  href: string;
  label: string;
}
