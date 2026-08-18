import { describe, expect, it } from 'vitest';
import { hydratePRCard } from './hydrate-pr';
import { sanitizeMetadata } from './sanitize-metadata';
import { toDexCard } from './to-dex-card';
import type { TriageViewEntity } from '../entities/triage-view';

const makeApiPR = (overrides: Record<string, unknown> = {}) => ({
  number: 42,
  title: 'fix(dex): closes #526',
  user: { login: 'greyZ', type: 'User' },
  created_at: '2026-02-01T00:00:00Z',
  updated_at: '2026-02-02T00:00:00Z',
  head: { ref: 'fix/dex-526' },
  draft: false,
  requested_reviewers: [],
  labels: [{ name: 'bug' }],
  html_url: 'https://github.com/k-dot-greyz/dev-master/pull/42',
  ...overrides,
});

describe('hydratePRCard', () => {
  it('hydrates a valid API response to PRCardEntity', () => {
    const entity = hydratePRCard(makeApiPR() as never);
    expect(entity.id).toBe('pr-42');
    expect(entity.issueRefs).toEqual([526]);
    expect(entity.url).toBe('https://github.com/k-dot-greyz/dev-master/pull/42');
    expect(entity.authorType).toBe('human');
  });

  it('sanitizes hostile URLs', () => {
    const entity = hydratePRCard(
      makeApiPR({ html_url: 'javascript:alert(1)' }) as never
    );
    expect(entity.url).toBe('#');
  });

  it('is idempotent', () => {
    const api = makeApiPR() as never;
    expect(hydratePRCard(api)).toEqual(hydratePRCard(api));
  });
});

describe('sanitizeMetadata', () => {
  it('clamps long strings', () => {
    const result = sanitizeMetadata({ title: 'x'.repeat(20_000) }) as Record<
      string,
      string
    >;
    expect(result.title.length).toBe(10_000);
  });

  it('is idempotent', () => {
    const input = { a: 1, b: 'hello' };
    const once = sanitizeMetadata(input);
    const twice = sanitizeMetadata(once);
    expect(once).toEqual(twice);
  });
});

describe('toDexCard', () => {
  const view: TriageViewEntity = {
    version: 1,
    generatedAt: '2026-02-01T00:00:00Z',
    owner: 'k-dot-greyz',
    repo: 'dev-master',
    stats: {
      total: 3,
      drafts: 0,
      ready: 3,
      byAuthorType: { human: 1, bot: 2, external: 0 },
      floodCount: 0,
      oldestPR: '2026-01-01',
      newestPR: '2026-02-01',
    },
    categories: {
      'human-ready': [],
      'human-draft': [],
      'bot-flood': [],
      'bot-tests': [],
      'bot-other': [],
      external: [],
    },
    floodPatterns: [],
    duplicates: [],
  };

  it('emits a stable dex_id from module_id', () => {
    const card = toDexCard(view, {
      module_id: 'MOD-PIPE-DEX',
      dex_type: 'pipe',
      tags: ['dex'],
    });
    expect(card.dex_id).toBe('0x7D:0x11:MOD-PIPE-DEX');
    expect(card.metadata.laneCounts).toBeDefined();
  });

  it('is idempotent', () => {
    const template = {
      module_id: 'MOD-PIPE-DEX',
      dex_type: 'pipe' as const,
      tags: ['dex'],
    };
    expect(toDexCard(view, template)).toEqual(toDexCard(view, template));
  });
});
