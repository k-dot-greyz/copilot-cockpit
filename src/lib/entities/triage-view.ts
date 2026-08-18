/**
 * Joint entity: triage view snapshot.
 * Serializable for exportState / loadState and dex card hydration.
 */

import type { PRCardEntity } from './pr-card';

export type PRCategory =
  | 'human-ready'
  | 'human-draft'
  | 'bot-flood'
  | 'bot-tests'
  | 'bot-other'
  | 'external';

export interface CategorizedPRs {
  'human-ready': PRCardEntity[];
  'human-draft': PRCardEntity[];
  'bot-flood': PRCardEntity[];
  'bot-tests': PRCardEntity[];
  'bot-other': PRCardEntity[];
  external: PRCardEntity[];
}

export interface TriageStats {
  total: number;
  drafts: number;
  ready: number;
  byAuthorType: { human: number; bot: number; external: number };
  floodCount: number;
  oldestPR: string;
  newestPR: string;
}

export interface TriageViewEntity {
  version: 1;
  generatedAt: string;
  owner: string;
  repo: string;
  stats: TriageStats;
  categories: CategorizedPRs;
  floodPatterns: FloodPatternEntity[];
  duplicates: DuplicateGroupEntity[];
}

export interface FloodPatternEntity {
  pattern: string;
  count: number;
  prIds: string[];
  uniqueIssues: number;
  dateRange: { oldest: string; newest: string };
}

export interface DuplicateGroupEntity {
  title: string;
  count: number;
  prIds: string[];
}
