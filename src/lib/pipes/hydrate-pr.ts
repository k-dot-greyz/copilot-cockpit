/**
 * Hydrate pipe: hostile API payload → PRCardEntity.
 * Idempotent: same validated input always yields same entity.
 */

import type { PRCardEntity } from '../entities/pr-card';
import type { PRApiResponse } from '../github';
import { extractIssueRefs } from '../issue-refs';
import { classifyAuthor } from '../validation/author-classification';
import { sanitizePrUrl } from '../validation/pr-url';

/**
 * Map a single GitHub REST PR response to a hydrated PRCardEntity.
 */
export function hydratePRCard(api: PRApiResponse): PRCardEntity {
  const title = typeof api.title === 'string' ? api.title : '';
  const author = api.user?.login ?? 'unknown';
  const number = api.number;

  return {
    id: `pr-${number}`,
    number,
    title,
    author,
    authorType: classifyAuthor(author, api.user?.type ?? 'User'),
    createdAt: api.created_at ?? '',
    updatedAt: api.updated_at ?? '',
    headRefName: api.head?.ref ?? '',
    isDraft: Boolean(api.draft),
    reviewDecision: null,
    labels: (api.labels ?? [])
      .filter((l): l is { name: string } => Boolean(l?.name))
      .map((l) => l.name),
    url: sanitizePrUrl(api.html_url),
    issueRefs: extractIssueRefs(title),
    checksStatus: 'none',
    mergeable: 'UNKNOWN',
    state: 'OPEN',
    commentsCount: 0,
    additions: 0,
    deletions: 0,
  };
}
