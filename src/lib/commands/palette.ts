import type { PR } from '../github';
import type { ActionCard } from '../config/cockpit';

export type PaletteItem =
  | { kind: 'action'; id: string; label: string }
  | { kind: 'pr'; id: string; label: string; prNumber: number };

function haystack(pr: PR): string {
  return `#${pr.number} ${pr.title} ${pr.author} ${pr.headRefName}`.toLowerCase();
}

export function searchPalette(query: string, prs: PR[], actions: ActionCard[]): PaletteItem[] {
  const q = query.trim().toLowerCase();
  const actionItems: PaletteItem[] = actions
    .filter((action) => !q || action.title.toLowerCase().includes(q) || action.id.includes(q))
    .map((action) => ({ kind: 'action', id: action.id, label: action.title }));

  const prItems: PaletteItem[] = prs
    .filter((pr) => {
      if (!q) return true;
      return haystack(pr).includes(q.replace(/^#/, ''));
    })
    .map((pr) => ({
      kind: 'pr' as const,
      id: `pr-${pr.number}`,
      label: `#${pr.number} ${pr.title}`,
      prNumber: pr.number,
    }));

  if (!q) {
    return [...actionItems, ...prItems];
  }
  return [...actionItems, ...prItems];
}
