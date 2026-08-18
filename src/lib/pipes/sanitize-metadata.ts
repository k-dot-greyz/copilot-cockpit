/**
 * Sanitize pipe: strip or neutralize hostile metadata before entity hydration.
 * Operates on raw key/value pairs from API or AI payloads.
 */

const MAX_STRING_LEN = 10_000;

export interface SanitizedMetadata {
  [key: string]: string | number | boolean | null | SanitizedMetadata | SanitizedMetadata[];
}

/**
 * Recursively clamp strings and drop functions/symbols.
 * Idempotent: already-sanitized input passes through unchanged.
 */
export function sanitizeMetadata(
  input: unknown,
  depth = 0
): SanitizedMetadata | string | number | boolean | null {
  if (depth > 8) return null;
  if (input === null || input === undefined) return null;
  if (typeof input === 'boolean' || typeof input === 'number') return input;
  if (typeof input === 'string') {
    return input.slice(0, MAX_STRING_LEN);
  }
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeMetadata(item, depth + 1)) as SanitizedMetadata[];
  }
  if (typeof input === 'object') {
    const out: SanitizedMetadata = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (typeof value === 'function' || typeof value === 'symbol') continue;
      const safeKey = key.slice(0, 128);
      out[safeKey] = sanitizeMetadata(value, depth + 1) as SanitizedMetadata;
    }
    return out;
  }
  return null;
}
