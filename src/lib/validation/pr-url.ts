const ALLOWED_GITHUB_HOSTS = new Set(['github.com', 'www.github.com']);
const ALLOWED_AVATAR_HOSTS = ['avatars.githubusercontent.com'];
const ALLOWED_AVATAR_HOST_SET = new Set(ALLOWED_AVATAR_HOSTS);

const PR_PATH = /^\/[^/]+\/[^/]+\/pull\/\d+\/?$/;
const ISSUE_PATH = /^\/[^/]+\/[^/]+\/issues\/\d+\/?$/;

function isAllowedGithubUrl(url: string, pathPattern: RegExp): boolean {
  if (!url || typeof url !== 'string') return false;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') return false;
  if (!ALLOWED_GITHUB_HOSTS.has(parsed.hostname)) return false;
  if (parsed.username || parsed.password) return false;

  return pathPattern.test(parsed.pathname);
}

/**
 * Returns true when `url` is an https GitHub pull-request link safe to render as href.
 */
export function isAllowedGithubPrUrl(url: string): boolean {
  return isAllowedGithubUrl(url, PR_PATH);
}

/**
 * Returns true when `url` is an https GitHub issue link safe to render as href.
 */
export function isAllowedGithubIssueUrl(url: string): boolean {
  return isAllowedGithubUrl(url, ISSUE_PATH);
}

/**
 * Sanitize PR links from hostile or malformed API payloads before render.
 */
export function sanitizePrUrl(url: string | undefined | null): string {
  if (!url) return '#';
  return isAllowedGithubPrUrl(url) ? url : '#';
}

/**
 * Sanitize issue links from hostile or malformed API payloads before render.
 */
export function sanitizeGithubIssueUrl(url: string | undefined | null): string {
  if (!url) return '#';
  return isAllowedGithubIssueUrl(url) ? url : '#';
}

/**
 * Returns true when `url` is an https GitHub avatar URL safe to use as img src.
 */
export function isAllowedGithubAvatarUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'https:') return false;
  if (!ALLOWED_AVATAR_HOST_SET.has(parsed.hostname)) return false;
  if (parsed.username || parsed.password) return false;

  return true;
}

/**
 * Sanitize avatar URLs from hostile or malformed API payloads before render.
 */
export function sanitizeGithubAvatarUrl(url: string | undefined | null): string {
  if (!url) return '';
  return isAllowedGithubAvatarUrl(url) ? url : '';
}
