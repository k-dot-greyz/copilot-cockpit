import type { PR } from './github';

export function numbersToCloseKeepingOldest(
  clusters: { title: string; count: number; prs: PR[] }[]
): number[] {
  const numbers: number[] = [];
  for (const cluster of clusters) {
    const sorted = [...cluster.prs].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    for (const pr of sorted.slice(1)) {
      numbers.push(pr.number);
    }
  }
  return numbers;
}
