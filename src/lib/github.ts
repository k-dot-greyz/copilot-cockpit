// GitHub API client for copilot-cockpit
// Client-side only — uses token from localStorage

export interface PR {
  number: number;
  title: string;
  author: string;
  authorType: 'human' | 'bot' | 'external';
  createdAt: string;
  updatedAt: string;
  headRefName: string;
  isDraft: boolean;
  reviewDecision: string | null;
  labels: string[];
  url: string;
}

export interface PRApiResponse {
  number: number;
  title: string;
  user: { login: string; type: string };
  created_at: string;
  updated_at: string;
  head: { ref: string };
  draft: boolean;
  requested_reviewers: unknown[];
  labels: { name: string }[];
  html_url: string;
}

const API_BASE = 'https://api.github.com';
const PER_PAGE = 100;

function getHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

function classifyAuthor(login: string, type: string): PR['authorType'] {
  if (type === 'Bot' || login.startsWith('app/') || login.includes('[bot]')) {
    return 'bot';
  }
  // Add your own username(s) here
  const knownHumans = ['k-dot-greyz', 'kasparsgreizis'];
  if (knownHumans.includes(login)) {
    return 'human';
  }
  return 'external';
}

function mapPR(raw: PRApiResponse): PR {
  return {
    number: raw.number,
    title: raw.title,
    author: raw.user.login,
    authorType: classifyAuthor(raw.user.login, raw.user.type),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    headRefName: raw.head.ref,
    isDraft: raw.draft,
    reviewDecision: null, // REST API doesn't return this directly
    labels: raw.labels.map((l) => l.name),
    url: raw.html_url,
  };
}

/**
 * Fetch all open PRs with pagination.
 * Calls onProgress with (loaded, total) for each page.
 */
export async function fetchOpenPRs(
  owner: string,
  repo: string,
  token: string,
  onProgress?: (loaded: number, estimatedTotal: number) => void
): Promise<PR[]> {
  const allPRs: PR[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${API_BASE}/repos/${owner}/${repo}/pulls?state=open&per_page=${PER_PAGE}&page=${page}`;
    const res = await fetch(url, { headers: getHeaders(token) });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub API error ${res.status}: ${body}`);
    }

    const data: PRApiResponse[] = await res.json();
    const mapped = data.map(mapPR);
    allPRs.push(...mapped);

    // Parse Link header for total pages
    const linkHeader = res.headers.get('Link') || '';
    const lastMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
    const estimatedTotal = lastMatch
      ? parseInt(lastMatch[1]) * PER_PAGE
      : allPRs.length;

    onProgress?.(allPRs.length, estimatedTotal);

    hasMore = data.length === PER_PAGE;
    page++;

    // Respect rate limits — small delay between pages
    if (hasMore) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  return allPRs;
}

/**
 * Close a single PR. Optionally delete its branch.
 */
export async function closePR(
  owner: string,
  repo: string,
  number: number,
  token: string,
  deleteBranch = false
): Promise<void> {
  // Close the PR
  const closeUrl = `${API_BASE}/repos/${owner}/${repo}/pulls/${number}`;
  const closeRes = await fetch(closeUrl, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify({ state: 'closed' }),
  });

  if (!closeRes.ok) {
    const body = await closeRes.text();
    throw new Error(`Failed to close PR #${number}: ${closeRes.status} ${body}`);
  }

  // Delete branch if requested
  if (deleteBranch) {
    const prData = await closeRes.json();
    const branchRef = prData.head?.ref;
    if (branchRef) {
      const delUrl = `${API_BASE}/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branchRef)}`;
      // Best-effort — branch may already be deleted or protected
      await fetch(delUrl, {
        method: 'DELETE',
        headers: getHeaders(token),
      }).catch(() => {});
    }
  }
}

/**
 * Bulk-close PRs with rate limiting and progress callback.
 */
export async function bulkClosePRs(
  owner: string,
  repo: string,
  numbers: number[],
  token: string,
  deleteBranch = false,
  onProgress?: (completed: number, total: number, current: number) => void
): Promise<{ closed: number[]; failed: { number: number; error: string }[] }> {
  const closed: number[] = [];
  const failed: { number: number; error: string }[] = [];

  for (let i = 0; i < numbers.length; i++) {
    const num = numbers[i];
    try {
      await closePR(owner, repo, num, token, deleteBranch);
      closed.push(num);
    } catch (err) {
      failed.push({
        number: num,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    onProgress?.(i + 1, numbers.length, num);

    // Rate limit: ~30 requests per minute to be safe
    if (i < numbers.length - 1) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  return { closed, failed };
}

/**
 * Validate a GitHub token by fetching the authenticated user.
 */
export async function validateToken(token: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/user`, { headers: getHeaders(token) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.login;
  } catch {
    return null;
  }
}
