// GitHub API client for copilot-cockpit
// Client-side only — uses token from sessionStorage

import { sanitizePrUrl } from './validation/pr-url';

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

/**
 * Builds HTTP headers required for GitHub REST API requests using the provided token.
 *
 * @param token - A GitHub authentication token (personal access token, OAuth token, or GitHub App installation token)
 * @returns An object suitable for fetch/HTTP clients containing `Authorization`, `Accept`, and `X-GitHub-Api-Version` headers
 */
function getHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

/**
 * Classifies a GitHub account login and account type as 'bot', 'human', or 'external'.
 *
 * @returns `'bot'` if the account is identified as a bot, `'human'` if the login matches the internal allowlist, `'external'` otherwise.
 */
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

/**
 * Converts a GitHub REST pull request response into the normalized `PR` shape.
 *
 * @param raw - The raw pull request object returned by the GitHub REST API
 * @returns A `PR` object with selected fields mapped from `raw`; `reviewDecision` is set to `null` because the REST response does not provide it
 */
function mapPR(raw: PRApiResponse): PR {
  const labels = Array.isArray(raw.labels)
    ? raw.labels
        .map((l) => (l && typeof l.name === 'string' ? l.name : ''))
        .filter(Boolean)
    : [];

  return {
    number: raw.number,
    title: typeof raw.title === 'string' ? raw.title : '',
    author: raw.user?.login ?? 'unknown',
    authorType: classifyAuthor(raw.user?.login ?? '', raw.user?.type ?? ''),
    createdAt: raw.created_at ?? '',
    updatedAt: raw.updated_at ?? '',
    headRefName: raw.head?.ref ?? '',
    isDraft: Boolean(raw.draft),
    reviewDecision: null, // REST API doesn't return this directly
    labels,
    url: sanitizePrUrl(raw.html_url),
  };
}

/**
 * Fetches all open pull requests for the given repository using paginated requests.
 *
 * Calls `onProgress` after each fetched page with the number of loaded PRs and an estimated total.
 *
 * @param onProgress - Optional callback invoked as `(loaded, estimatedTotal)` after each page is fetched
 * @returns An array of normalized `PR` objects for all open pull requests
 * @throws Error if the GitHub API responds with a non-OK status; the error message includes the HTTP status and response body
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
 * Close a pull request and optionally remove its head branch.
 *
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param number - Pull request number
 * @param token - GitHub API token used for authorization
 * @param deleteBranch - If `true`, attempts to delete the PR's head branch; branch deletion is best-effort and any deletion errors are ignored
 * @throws Error if the request to close the pull request fails; the error message includes the HTTP status and response body
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
 * Closes multiple pull requests sequentially, optionally deleting their head branches, with simple rate limiting and progress notifications.
 *
 * @param owner - Repository owner or organization
 * @param repo - Repository name
 * @param numbers - Array of pull request numbers to close, processed in order
 * @param token - GitHub API token used for authentication
 * @param deleteBranch - If `true`, attempt to delete each PR's head branch after closing (best-effort)
 * @param onProgress - Optional callback invoked after each attempt with `(completed, total, current)` where `completed` is the number of processed PRs, `total` is `numbers.length`, and `current` is the PR number just processed
 * @returns An object with `closed`, the list of PR numbers successfully closed, and `failed`, an array of `{ number, error }` entries for PRs that failed to close
 */
export async function bulkClosePRs(
  owner: string,
  repo: string,
  numbers: number[],
  token: string,
  deleteBranch = false,
  onProgress?: (completed: number, total: number, current: number) => void
): Promise<{ closed: number[]; failed: { number: number; error: string }[] }> {
  const DESIRED_REQUESTS_PER_MINUTE = 30;
  const BASE_INTERVAL_MS = Math.ceil(60000 / DESIRED_REQUESTS_PER_MINUTE);
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

    // Rate limit: computed per-iteration delay
    if (i < numbers.length - 1) {
      const perIterationDelayMs = BASE_INTERVAL_MS * (deleteBranch ? 2 : 1);
      await new Promise((r) => setTimeout(r, perIterationDelayMs));
    }
  }

  return { closed, failed };
}

/**
 * Check whether a GitHub token is valid and return the associated username.
 *
 * @returns The authenticated user's login name, or `null` if the token is invalid or the request fails.
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
