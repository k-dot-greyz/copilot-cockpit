/**
 * Joint entity: hydrated, sanitized PR card.
 * Consumed by triage, dashboard, and dex card pipes.
 * Do not import API clients or DOM types here.
 */

export type AuthorType = 'human' | 'bot' | 'external';

export interface PRCardEntity {
  /** Stable id for dedup and dex card refs */
  id: string;
  number: number;
  title: string;
  author: string;
  authorType: AuthorType;
  createdAt: string;
  updatedAt: string;
  headRefName: string;
  isDraft: boolean;
  reviewDecision: string | null;
  labels: string[];
  /** Always sanitized — never a hostile href */
  url: string;
  /** Issue refs extracted from title, deduped */
  issueRefs: number[];
}
