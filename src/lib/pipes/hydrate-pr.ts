/**
 * Hydrate pipe: hostile API payload → PRCardEntity.
 * Idempotent: same validated input always yields same entity.
 */

import type { PRCardEntity } from '../entities/pr-card';
import type { PRApiResponse } from '../github';
import { extractIssueRefs } from '../triage';
import { sanitizePrUrl } from '../validation/pr-url';

function classifyAuthor(login: string, type: string): PRCardEntity['authorType'] {
  if (type === 'Bot') return 'bot';
  if (login === 'k-dot-greyz' || login === 'greyZ') return 'human';
  return 'external';
}

/**
 * Map a single GitHub REST PR response to a hydrated PRCardEntity.
 */
export function hydratePRCard(api: PRApiResponse): PRCardEntity {
  const title = typeof api.title === 'string' ? api.title : '';
  const author = api.user?.login ?? 'unknown';

  return {
    id: `pr-${api.number}`,
    number: api.number,
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
  };
}
