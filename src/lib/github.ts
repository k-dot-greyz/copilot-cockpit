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
  mergeable: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN';
  commentCount: number;
}

export interface TimelineItem {
  id: string;
  type: 'comment' | 'review' | 'review-comment';
  author: string;
  authorAvatarUrl: string;
  body: string;
  createdAt: string;
  reviewState?: string; // e.g. APPROVED, CHANGES_REQUESTED
  filePath?: string;    // for line review comments
  lineNumber?: number;  // for line review comments
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

function classifyAuthor(login: string, typename: string): PR['authorType'] {
  if (typename === 'Bot' || login.startsWith('app/') || login.includes('[bot]')) {
    return 'bot';
  }
  const knownHumans = ['k-dot-greyz', 'kasparsgreizis'];
  if (knownHumans.includes(login)) {
    return 'human';
  }
  return 'external';
}

const prsQuery = `
  query($owner: String!, $name: String!, $cursor: String) {
    repository(owner: $owner, name: $name) {
      pullRequests(states: OPEN, first: 100, after: $cursor) {
        totalCount
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          number
          title
          isDraft
          permalink
          createdAt
          updatedAt
          headRefName
          author {
            login
            __typename
          }
          mergeable
          reviewDecision
          labels(first: 10) {
            nodes {
              name
            }
          }
          comments {
            totalCount
          }
        }
      }
    }
  }
`;

/**
 * Fetch all open PRs using GraphQL (includes merge conflict state).
 */
export async function fetchOpenPRs(
  owner: string,
  repo: string,
  token: string,
  onProgress?: (loaded: number, estimatedTotal: number) => void
): Promise<PR[]> {
  const allPRs: PR[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: prsQuery,
        variables: { owner, name: repo, cursor },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub GraphQL error ${res.status}: ${body}`);
    }

    const responseData = await res.json();
    if (responseData.errors) {
      throw new Error(`GitHub GraphQL error: ${JSON.stringify(responseData.errors)}`);
    }

    const repoData = responseData.data?.repository;
    if (!repoData) {
      throw new Error(`Repository ${owner}/${repo} not found or inaccessible.`);
    }

    const prConnection = repoData.pullRequests;
    const nodes = prConnection.nodes || [];
    
    for (const raw of nodes) {
      const authorLogin = raw.author?.login || 'ghost';
      const authorType = classifyAuthor(authorLogin, raw.author?.__typename || 'User');
      
      allPRs.push({
        number: raw.number,
        title: raw.title,
        author: authorLogin,
        authorType,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
        headRefName: raw.headRefName,
        isDraft: raw.isDraft,
        reviewDecision: raw.reviewDecision,
        labels: raw.labels.nodes.map((l: any) => l.name),
        url: raw.permalink,
        mergeable: raw.mergeable || 'UNKNOWN',
        commentCount: raw.comments?.totalCount || 0,
      });
    }

    hasNextPage = prConnection.pageInfo.hasNextPage;
    cursor = prConnection.pageInfo.endCursor;

    onProgress?.(allPRs.length, prConnection.totalCount || allPRs.length);

    if (hasNextPage) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  return allPRs;
}

const timelineQuery = `
  query($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        comments(first: 100) {
          nodes {
            id
            author {
              login
              avatarUrl
            }
            body
            createdAt
          }
        }
        reviews(first: 50) {
          nodes {
            id
            author {
              login
              avatarUrl
            }
            state
            body
            createdAt
            comments(first: 50) {
              nodes {
                id
                author {
                  login
                  avatarUrl
                }
                body
                createdAt
                path
                line
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Fetch detailed timeline (comments and reviews) for a single PR.
 */
export async function fetchPRTimeline(
  owner: string,
  repo: string,
  number: number,
  token: string
): Promise<TimelineItem[]> {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: timelineQuery,
      variables: { owner, name: repo, number },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub GraphQL error ${res.status}: ${body}`);
  }

  const responseData = await res.json();
  if (responseData.errors) {
    throw new Error(`GitHub GraphQL error: ${JSON.stringify(responseData.errors)}`);
  }

  const pr = responseData.data?.repository?.pullRequest;
  if (!pr) {
    throw new Error(`Pull Request #${number} not found.`);
  }

  const items: TimelineItem[] = [];

  // 1. General issue comments
  if (pr.comments?.nodes) {
    for (const c of pr.comments.nodes) {
      items.push({
        id: c.id,
        type: 'comment',
        author: c.author?.login || 'ghost',
        authorAvatarUrl: c.author?.avatarUrl || '',
        body: c.body,
        createdAt: c.createdAt,
      });
    }
  }

  // 2. Reviews and line comments
  if (pr.reviews?.nodes) {
    for (const r of pr.reviews.nodes) {
      // General review comment (only if body is not empty)
      if (r.body && r.body.trim() !== '') {
        items.push({
          id: r.id,
          type: 'review',
          author: r.author?.login || 'ghost',
          authorAvatarUrl: r.author?.avatarUrl || '',
          body: r.body,
          createdAt: r.createdAt,
          reviewState: r.state,
        });
      }

      // Line comments inside review
      if (r.comments?.nodes) {
        for (const lc of r.comments.nodes) {
          items.push({
            id: lc.id,
            type: 'review-comment',
            author: lc.author?.login || 'ghost',
            authorAvatarUrl: lc.author?.avatarUrl || '',
            body: lc.body,
            createdAt: lc.createdAt,
            filePath: lc.path,
            lineNumber: lc.line,
          });
        }
      }
    }
  }

  // Sort chronologically
  return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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

  if (deleteBranch) {
    const prData = await closeRes.json();
    const branchRef = prData.head?.ref;
    if (branchRef) {
      const delUrl = `${API_BASE}/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branchRef)}`;
      await fetch(delUrl, {
        method: 'DELETE',
        headers: getHeaders(token),
      }).catch(() => {});
    }
  }
}

/**
 * Bulk-close PRs with progress callback.
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

    if (i < numbers.length - 1) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  return { closed, failed };
}

/**
 * Add a label to an issue/PR (used for invoking Jules).
 */
export async function addIssueLabel(
  owner: string,
  repo: string,
  number: number,
  label: string,
  token: string
): Promise<void> {
  const url = `${API_BASE}/repos/${owner}/${repo}/issues/${number}/labels`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ labels: [label] }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to add label: ${res.status} ${body}`);
  }
}

/**
 * Add a comment to an issue/PR (used for invoking Cursor).
 */
export async function createIssueComment(
  owner: string,
  repo: string,
  number: number,
  body: string,
  token: string
): Promise<void> {
  const url = `${API_BASE}/repos/${owner}/${repo}/issues/${number}/comments`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ body }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create comment: ${res.status} ${body}`);
  }
}

/**
 * Validate a GitHub token.
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
