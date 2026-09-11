import { describe, expect, it } from 'vitest';
import { parseCockpit } from './cockpit';

const validConfig = {
  dex_id: '0x7D:0x30',
  schema: 'cockpit_config',
  title: 'Copilot Cockpit',
  target: { owner: 'k-dot-greyz', repo: 'dev-master' },
  auth: { tokenKey: 'cockpit-gh-token' },
  team: { humanLogins: ['k-dot-greyz', 'kasparsgreizis', 'greyZ'] },
  flood: { minCount: 10 },
  rateLimit: { warnRemaining: 50 },
};

const humanReadyLane = {
  id: 'human-ready',
  title: 'Ready for Review',
  emoji: '🔥',
  accent: 'ready',
  order: 0,
  matchPriority: 1,
  match: 'all',
  matchers: [
    { type: 'authorType', value: 'human' },
    { type: 'isDraft', value: false },
  ],
};

const nukeAction = {
  id: 'nuke-flood',
  title: 'Nuke flood PRs',
  kind: 'nuke',
  confirm: true,
};

describe('parseCockpit', () => {
  it('hydrates a valid config card and rejects hardcoded-empty targets', () => {
    const cockpit = parseCockpit({
      config: validConfig,
      lanes: [humanReadyLane],
      actions: [nukeAction],
    });
    expect(cockpit.target.owner).toBe('k-dot-greyz');
    expect(cockpit.target.repo).toBe('dev-master');
    expect(cockpit.auth.tokenKey).toBe('cockpit-gh-token');
    expect(cockpit.team.humanLogins).toContain('greyZ');
    expect(cockpit.lanes).toHaveLength(1);
    expect(cockpit.actions[0].id).toBe('nuke-flood');
  });

  it('applies a local target override without mutating the card', () => {
    const cockpit = parseCockpit({
      config: validConfig,
      lanes: [humanReadyLane],
      actions: [],
      targetOverride: { owner: 'acme', repo: 'widgets' },
    });
    expect(cockpit.target).toEqual({ owner: 'acme', repo: 'widgets' });
    expect(validConfig.target).toEqual({ owner: 'k-dot-greyz', repo: 'dev-master' });
  });

  it('rejects missing owner/repo instead of falling back to hardcoded defaults', () => {
    expect(() =>
      parseCockpit({
        config: { ...validConfig, target: { owner: '', repo: 'dev-master' } },
        lanes: [humanReadyLane],
        actions: [],
      })
    ).toThrow(/owner/i);
  });

  it('sorts lanes by visual order and keeps matchPriority intact', () => {
    const flood = {
      ...humanReadyLane,
      id: 'bot-flood',
      order: 5,
      matchPriority: 0,
      matchers: [{ type: 'flood' }],
    };
    const cockpit = parseCockpit({
      config: validConfig,
      lanes: [flood, humanReadyLane],
      actions: [],
    });
    expect(cockpit.lanes.map((l) => l.id)).toEqual(['human-ready', 'bot-flood']);
    expect(cockpit.lanes.find((l) => l.id === 'bot-flood')?.matchPriority).toBe(0);
  });
});
