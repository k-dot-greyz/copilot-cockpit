import { makePR } from './pr';
import type { PR } from '../github';

/** Offline board used by `?demo=1` — no GitHub, no token. */
export function loadDemoPrs(): PR[] {
  const flood = Array.from({ length: 10 }, (_, i) =>
    makePR({
      number: i + 1,
      title: `Resolve issue #${100 + i}`,
      author: 'copilot[bot]',
      authorType: 'bot',
      isDraft: true,
      headRefName: `greyzxc/issue-resolution-${(i + 1).toString(16).padStart(4, '0')}`,
      createdAt: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    })
  );
  return [
    ...flood,
    makePR({
      number: 19,
      title: 'chore(cleanup): extract stickhrpg to stickhrpg-dev',
      authorType: 'human',
      isDraft: false,
      checksStatus: 'success',
      reviewDecision: 'APPROVED',
    }),
    makePR({
      number: 20,
      title: 'feat(cockpit): schema-hydrated kanban',
      authorType: 'human',
      isDraft: true,
    }),
    makePR({
      number: 42,
      title: 'test(coverage): shield',
      author: 'copilot[bot]',
      authorType: 'bot',
      headRefName: 'greyzxcursor/agentic-security-test-coverage-7c3c',
    }),
    makePR({
      number: 43,
      title: 'test(coverage): shield',
      author: 'copilot[bot]',
      authorType: 'bot',
      createdAt: '2026-01-15T00:00:00Z',
    }),
    makePR({
      number: 88,
      title: 'docs: outsider contribution',
      author: 'friendly-human',
      authorType: 'external',
    }),
  ];
}
