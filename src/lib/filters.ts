import type { PR } from './github';

export interface FilterCriteria {
  state?: 'OPEN' | 'CLOSED' | 'MERGED' | 'ALL';
  authorType?: 'human' | 'bot' | 'external' | 'all';
  label?: string;
  reviewDecision?: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | 'none' | 'all';
  checksStatus?: 'success' | 'failure' | 'pending' | 'none' | 'all';
  isDraft?: boolean | 'all';
  searchQuery?: string;
}

/**
 * Filters an array of PRs based on the provided criteria.
 * This is a pure function with no side effects or I/O.
 */
export function filterPRs(prs: PR[], criteria: FilterCriteria): PR[] {
  return prs.filter((pr) => {
    // 1. Filter by state
    if (criteria.state && criteria.state !== 'ALL') {
      if (pr.state !== criteria.state) return false;
    }

    // 2. Filter by author type
    if (criteria.authorType && criteria.authorType !== 'all') {
      if (pr.authorType !== criteria.authorType) return false;
    }

    // 3. Filter by label
    if (criteria.label && criteria.label !== '' && criteria.label !== 'all') {
      if (!pr.labels.includes(criteria.label)) return false;
    }

    // 4. Filter by review decision
    if (criteria.reviewDecision && criteria.reviewDecision !== 'all') {
      if (criteria.reviewDecision === 'none') {
        if (pr.reviewDecision !== null) return false;
      } else {
        if (pr.reviewDecision !== criteria.reviewDecision) return false;
      }
    }

    // 5. Filter by checks status
    if (criteria.checksStatus && criteria.checksStatus !== 'all') {
      if (pr.checksStatus !== criteria.checksStatus) return false;
    }

    // 6. Filter by draft status
    if (criteria.isDraft !== undefined && criteria.isDraft !== 'all') {
      if (pr.isDraft !== criteria.isDraft) return false;
    }

    // 7. Filter by search query (case-insensitive search in title and branch name)
    if (criteria.searchQuery && criteria.searchQuery.trim() !== '') {
      const query = criteria.searchQuery.toLowerCase().trim();
      const titleMatch = pr.title.toLowerCase().includes(query);
      const branchMatch = pr.headRefName.toLowerCase().includes(query);
      const numberMatch = pr.number.toString() === query || `#${pr.number}` === query;
      if (!titleMatch && !branchMatch && !numberMatch) return false;
    }

    return true;
  });
}

/**
 * Extracts all unique labels from an array of PRs.
 */
export function getUniqueLabels(prs: PR[]): string[] {
  const labelsSet = new Set<string>();
  prs.forEach((pr) => {
    pr.labels.forEach((label) => {
      if (label) labelsSet.add(label);
    });
  });
  return Array.from(labelsSet).sort();
}
