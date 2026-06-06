// Triage logic — pure functions, no API calls
import type { PR } from './github';

export type PRCategory =
  | 'human-ready'
  | 'human-draft'
  | 'bot-flood'
  | 'bot-tests'
  | 'bot-other'
  | 'external';

export interface CategorizedPRs {
  'human-ready': PR[];
  'human-draft': PR[];
  'bot-flood': PR[];
  'bot-tests': PR[];
  'bot-other': PR[];
  external: PR[];
}

export interface FloodPattern {
  pattern: string;
  count: number;
  prs: PR[];
  uniqueIssues: number;
  dateRange: { oldest: string; newest: string };
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

/**
 * Extract issue references from PR title (e.g., "Fixes #123", "#456")
 */
export function extractIssueRefs(title: string): number[] {
  const matches = title.matchAll(/#(\d+)/g);
  return [...matches].map((m) => parseInt(m[1]));
}

/**
 * Detect flood patterns — branches that follow a common prefix
 * with many duplicate PRs targeting the same issues.
 */
export function detectFlood(prs: PR[], minCount = 10): FloodPattern[] {
  // Group by branch prefix pattern
  const prefixGroups = new Map<string, PR[]>();

  for (const pr of prs) {
    // Extract prefix before the hash suffix (e.g., "greyzxc/issue-resolution-" → "issue-resolution")
    const match = pr.headRefName.match(/^greyzxc\/([a-z-]+)-[a-f0-9]{4}$/);
    if (match) {
      const prefix = match[1];
      const group = prefixGroups.get(prefix) || [];
      group.push(pr);
      prefixGroups.set(prefix, group);
    }
  }

  const floods: FloodPattern[] = [];

  for (const [pattern, group] of prefixGroups) {
    if (group.length >= minCount) {
      const allIssues = new Set<number>();
      for (const pr of group) {
        extractIssueRefs(pr.title).forEach((n) => allIssues.add(n));
      }

      const dates = group.map((p) => p.createdAt).sort();

      floods.push({
        pattern,
        count: group.length,
        prs: group,
        uniqueIssues: allIssues.size,
        dateRange: {
          oldest: dates[0],
          newest: dates[dates.length - 1],
        },
      });
    }
  }

  return floods.sort((a, b) => b.count - a.count);
}

/**
 * Categorize PRs into groups for the dashboard.
 */
export function categorizePRs(prs: PR[]): CategorizedPRs {
  const floods = detectFlood(prs);
  const floodPRNumbers = new Set<number>();
  for (const flood of floods) {
    for (const pr of flood.prs) {
      floodPRNumbers.add(pr.number);
    }
  }

  const result: CategorizedPRs = {
    'human-ready': [],
    'human-draft': [],
    'bot-flood': [],
    'bot-tests': [],
    'bot-other': [],
    external: [],
  };

  for (const pr of prs) {
    if (floodPRNumbers.has(pr.number)) {
      result['bot-flood'].push(pr);
    } else if (pr.authorType === 'human') {
      if (pr.isDraft) {
        result['human-draft'].push(pr);
      } else {
        result['human-ready'].push(pr);
      }
    } else if (pr.authorType === 'bot') {
      // Check if it's a test/coverage PR
      const isTest =
        pr.title.startsWith('test(') ||
        pr.headRefName.includes('security') ||
        pr.headRefName.includes('coverage') ||
        pr.headRefName.includes('ux-security');
      if (isTest) {
        result['bot-tests'].push(pr);
      } else {
        result['bot-other'].push(pr);
      }
    } else {
      result['external'].push(pr);
    }
  }

  // Sort each group: newest first
  for (const key of Object.keys(result) as PRCategory[]) {
    result[key].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  return result;
}

/**
 * Compute summary stats for the dashboard header.
 */
export function computeStats(prs: PR[]): TriageStats {
  const floods = detectFlood(prs);
  let floodCount = 0;
  for (const f of floods) floodCount += f.count;

  const dates = prs.map((p) => p.createdAt).sort();

  return {
    total: prs.length,
    drafts: prs.filter((p) => p.isDraft).length,
    ready: prs.filter((p) => !p.isDraft).length,
    byAuthorType: {
      human: prs.filter((p) => p.authorType === 'human').length,
      bot: prs.filter((p) => p.authorType === 'bot').length,
      external: prs.filter((p) => p.authorType === 'external').length,
    },
    floodCount,
    oldestPR: dates[0] || '',
    newestPR: dates[dates.length - 1] || '',
  };
}

/**
 * Find duplicate PRs — same title appearing multiple times.
 */
export function findDuplicates(
  prs: PR[]
): { title: string; count: number; prs: PR[] }[] {
  const groups = new Map<string, PR[]>();

  for (const pr of prs) {
    const group = groups.get(pr.title) || [];
    group.push(pr);
    groups.set(pr.title, group);
  }

  return [...groups.entries()]
    .filter(([, g]) => g.length > 1)
    .map(([title, g]) => ({ title, count: g.length, prs: g }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Relative time string (e.g., "2 days ago")
 */
export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  return `${diffMonths}mo ago`;
}
