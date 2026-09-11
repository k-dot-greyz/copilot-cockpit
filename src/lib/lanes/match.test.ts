import { describe, expect, it } from 'vitest';
import { makePR } from '../fixtures/pr';
import { parseCockpit } from '../config/cockpit';
import { assignLanes, matchLane } from './match';
import { detectFlood } from '../triage';

const config = {
  dex_id: '0x7D:0x30',
  schema: 'cockpit_config',
  title: 'Copilot Cockpit',
  target: { owner: 'k-dot-greyz', repo: 'dev-master' },
  auth: { tokenKey: 'cockpit-gh-token' },
  team: { humanLogins: ['k-dot-greyz'] },
  flood: { minCount: 10 },
  rateLimit: { warnRemaining: 50 },
};

const lanes = [
  {
    id: 'bot-flood',
    title: 'Bot Flood',
    emoji: '🚨',
    accent: 'flood',
    order: 5,
    matchPriority: 0,
    match: 'all',
    matchers: [{ type: 'flood' }],
  },
  {
    id: 'human-ready',
    title: 'Ready',
    emoji: '🔥',
    accent: 'ready',
    order: 0,
    matchPriority: 1,
    match: 'all',
    matchers: [
      { type: 'authorType', value: 'human' },
      { type: 'isDraft', value: false },
    ],
  },
  {
    id: 'human-draft',
    title: 'Drafts',
    emoji: '📝',
    accent: 'draft',
    order: 1,
    matchPriority: 1,
    match: 'all',
    matchers: [
      { type: 'authorType', value: 'human' },
      { type: 'isDraft', value: true },
    ],
  },
  {
    id: 'bot-tests',
    title: 'Bot tests',
    emoji: '🧪',
    accent: 'bot',
    order: 2,
    matchPriority: 1,
    match: 'any',
    require: { authorType: 'bot' },
    matchers: [
      { type: 'titlePrefix', value: 'test(' },
      { type: 'refContains', value: 'security' },
      { type: 'refContains', value: 'coverage' },
    ],
  },
  {
    id: 'bot-other',
    title: 'Bot other',
    emoji: '🤖',
    accent: 'bot',
    order: 3,
    matchPriority: 1,
    match: 'all',
    matchers: [{ type: 'authorType', value: 'bot' }],
  },
  {
    id: 'external',
    title: 'External',
    emoji: '👥',
    accent: 'external',
    order: 4,
    matchPriority: 1,
    matchers: [{ type: 'authorType', value: 'external' }],
  },
];

function cockpitLanes() {
  return parseCockpit({ config, lanes, actions: [] }).lanes;
}

describe('matchLane', () => {
  it('matches human-ready only when every matcher passes', () => {
    const ready = cockpitLanes().find((l) => l.id === 'human-ready')!;
    const pr = makePR({ number: 1, authorType: 'human', isDraft: false });
    expect(matchLane(pr, ready, new Set())).toBe(true);
    expect(
      matchLane(makePR({ number: 2, authorType: 'human', isDraft: true }), ready, new Set())
    ).toBe(false);
  });

  it('matches bot-tests when any matcher hits (title prefix or ref)', () => {
    const tests = cockpitLanes().find((l) => l.id === 'bot-tests')!;
    expect(
      matchLane(
        makePR({ number: 1, title: 'test(security): harness', authorType: 'bot' }),
        tests,
        new Set()
      )
    ).toBe(true);
    expect(
      matchLane(
        makePR({
          number: 2,
          title: 'chore: bump',
          headRefName: 'greyzxcursor/agentic-security-test-coverage-7c3c',
          authorType: 'bot',
        }),
        tests,
        new Set()
      )
    ).toBe(true);
  });
});

describe('assignLanes', () => {
  it('gives flood PRs to the flood lane even if they are also bots', () => {
    const floodPrs = Array.from({ length: 10 }, (_, i) =>
      makePR({
        number: i + 1,
        authorType: 'bot',
        title: `test(coverage): ${i}`,
        headRefName: `greyzxc/issue-resolution-${(i + 1).toString(16).padStart(4, '0')}`,
      })
    );
    const human = makePR({ number: 99, authorType: 'human', isDraft: false });
    const all = [...floodPrs, human];
    const floodNumbers = new Set(detectFlood(all).flatMap((f) => f.prs.map((p) => p.number)));
    const assigned = assignLanes(all, cockpitLanes(), floodNumbers);

    expect(assigned['bot-flood']).toHaveLength(10);
    expect(assigned['human-ready']).toHaveLength(1);
    expect(assigned['bot-tests']).toHaveLength(0);
  });
});
