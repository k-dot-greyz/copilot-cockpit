const ALLOWED_GITHUB_HOSTS = new Set(['github.com', 'www.github.com']);

const PR_PATH = /^\/[^/]+\/[^/]+\/pull\/\d+\/?$/;

/**
 * Returns true when `url` is an https GitHub pull-request link safe to render as href.
 */
export function isAllowedGithubPrUrl(url: string): boolean {
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

  return PR_PATH.test(parsed.pathname);
}

/**
 * Sanitize PR links from hostile or malformed API payloads before render.
 */
export function sanitizePrUrl(url: string | undefined | null): string {
  if (!url) return '#';
  return isAllowedGithubPrUrl(url) ? url : '#';
}
