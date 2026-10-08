/**
 * Site-relative media paths only (`/...`).
 * No javascript:/data:, no protocol-relative, no remote URLs.
 */
const FORBIDDEN_CHARS = /[\u0000-\u001F\u007F\\]/;

export function isSiteRelativePath(path: string): boolean {
  if (!path) return false;
  if (/^(javascript|data|vbscript):/i.test(path)) return false;
  if (FORBIDDEN_CHARS.test(path)) return false;
  return path.startsWith('/') && !path.startsWith('//');
}

/** Drop hostile paths; keep valid site-relative paths unchanged. */
export function sanitizeSiteRelativePath(path: string): string {
  return isSiteRelativePath(path) ? path : '';
}
