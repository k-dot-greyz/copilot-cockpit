/**
 * Finds all issue references in a pull request title using the `#<number>` pattern.
 */
export function extractIssueRefs(title: string): number[] {
  const matches = title.matchAll(/#(\d+)/g);
  return [...matches].map((m) => parseInt(m[1]));
}
