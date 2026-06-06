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
 * Finds all issue references in a pull request title using the `#<number>` pattern.
 *
 * @param title - The pull request title to scan for `#<number>` references
 * @returns An array of extracted issue numbers (empty if none found)
 */
export function extractIssueRefs(title: string): number[] {
  const matches = title.matchAll(/#(\d+)/g);
  return [...matches].map((m) => parseInt(m[1]));
}

/**
 * Identify groups of PRs whose branch names follow the `greyzxc/<prefix>-<hash>` pattern and form a flood.
 *
 * For each detected prefix group with at least `minCount` members, returns a FloodPattern containing the
 * group's prefix (`pattern`), the matching PRs, the group's size (`count`), the number of unique issue
 * references found in PR titles (`uniqueIssues`), and the group's oldest/newest `createdAt` timestamps.
 *
 * @param prs - Array of PRs to analyze
 * @param minCount - Minimum number of PRs required for a prefix group to be reported as a flood
 * @returns Flood patterns that meet the `minCount` threshold, sorted by descending `count`
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
 * Assigns an array of PRs into dashboard categories.
 *
 * Flood-detected PRs are placed in `bot-flood`. Human authors are split into `human-draft` (drafts) and `human-ready` (non-drafts). Bot authors are classified as `bot-tests` when the title starts with `test(` or the head ref contains `security`, `coverage`, or `ux-security`; other bots go to `bot-other`. Non-human, non-bot authors go to `external`. Each category array is sorted newest-first by `createdAt`.
 *
 * @param prs - The list of pull requests to categorize
 * @returns An object with arrays of PRs for each dashboard category
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
 * Build aggregate triage statistics from a list of PRs for the dashboard header.
 *
 * @returns An object with:
 * - `total`: total number of PRs
 * - `drafts`: count of PRs where `isDraft` is true
 * - `ready`: count of PRs where `isDraft` is false
 * - `byAuthorType`: counts grouped by `human`, `bot`, and `external`
 * - `floodCount`: total number of PRs included in detected flood patterns
 * - `oldestPR`: the earliest `createdAt` value or an empty string if none
 * - `newestPR`: the latest `createdAt` value or an empty string if none
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
 * Identify groups of pull requests that share the exact same title.
 *
 * Only groups with more than one PR are returned; groups are sorted by descending size.
 *
 * @returns An array of objects for each duplicate-title group containing `title`, `count` (number of PRs in the group), and `prs` (the PRs in that group). */
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
 * Formats a timestamp string into a concise human-readable relative time label.
 *
 * @param dateStr - A date string accepted by the JS `Date` constructor (e.g., ISO 8601)
 * @returns `just now` for <1 minute, `<Nm ago` for minutes, `<Nh ago` for hours, `<Nd ago` for days, `<Nw ago` for weeks, or `<Nmo ago` for months
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
