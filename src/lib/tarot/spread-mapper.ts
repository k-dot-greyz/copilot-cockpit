import type { PR, PRDetail } from '../github';

export type TarotElement = 'void' | 'fire' | 'water' | 'aether' | 'electric' | 'dark';

export interface TarotCardSpreadSlot {
  id: string;
  position: 'origin' | 'crucible' | 'oracle';
  title: string;
  arcana: string;
  archetype: string;
  element: TarotElement;
  status: string;
  is_reversed: boolean;
  glyphs: string[];
  metrics: Record<string, string | number | boolean | null>;
  action?: { label: string; kind: string };
}

export interface ExplainerArcana {
  summary: string;
  risk_level: 'low' | 'moderate' | 'high' | 'critical';
  verdict: string;
  key_files: string[];
}

export interface TarotReviewSpread {
  spread_id: string;
  pr_number: number;
  orientation: 'upright' | 'reversed';
  cards: {
    origin: TarotCardSpreadSlot;
    crucible: TarotCardSpreadSlot;
    oracle: TarotCardSpreadSlot;
  };
  explainer: ExplainerArcana;
}

function isBotFlood(pr: PR): boolean {
  if (pr.authorType === 'human') return false;
  return pr.headRefName.startsWith('greyzxc/') || pr.headRefName.includes('issue-resolution');
}

export function mapPRToTarotSpread(pr: PR, detail?: PRDetail | null): TarotReviewSpread {
  const isFlood = isBotFlood(pr);

  // 1. Card I: The Origin
  let origin: TarotCardSpreadSlot;
  if (isFlood) {
    origin = {
      id: `tarot-${pr.number}-origin`,
      position: 'origin',
      title: 'I. The Origin',
      arcana: 'The Fool',
      archetype: 'Infinite Potential / Chaos',
      element: 'void',
      status: 'FLOOD_ANOMALY',
      is_reversed: true,
      glyphs: ['Void', 'Eye', 'Sparkles'],
      metrics: {
        author: pr.author,
        authorType: pr.authorType,
        headRefName: pr.headRefName,
        issueCount: pr.issueRefs.length,
      },
      action: { label: 'Nuke Flood PR', kind: 'nuke' },
    };
  } else if (
    pr.authorType === 'bot' &&
    (pr.title.startsWith('test(') ||
      pr.headRefName.includes('security') ||
      pr.headRefName.includes('coverage'))
  ) {
    origin = {
      id: `tarot-${pr.number}-origin`,
      position: 'origin',
      title: 'I. The Origin',
      arcana: 'The Emperor',
      archetype: 'Automated Sentinel / Order',
      element: 'electric',
      status: 'SENTINEL_SHIELD',
      is_reversed: false,
      glyphs: ['Zap', 'Shield', 'Crown'],
      metrics: {
        author: pr.author,
        authorType: pr.authorType,
        headRefName: pr.headRefName,
        issueCount: pr.issueRefs.length,
      },
    };
  } else if (pr.authorType === 'human') {
    origin = {
      id: `tarot-${pr.number}-origin`,
      position: 'origin',
      title: 'I. The Origin',
      arcana: 'The Magician',
      archetype: 'Manifestation / Creator',
      element: pr.isDraft ? 'water' : 'aether',
      status: pr.isDraft ? 'DRAFT_INCUBATING' : 'HUMAN_AUTHOR',
      is_reversed: false,
      glyphs: ['Flame', 'Sparkles', 'Star'],
      metrics: {
        author: pr.author,
        authorType: pr.authorType,
        headRefName: pr.headRefName,
        issueCount: pr.issueRefs.length,
      },
    };
  } else {
    origin = {
      id: `tarot-${pr.number}-origin`,
      position: 'origin',
      title: 'I. The Origin',
      arcana: 'The Chariot',
      archetype: 'Outsider Voyager',
      element: 'water',
      status: 'EXTERNAL_VOYAGER',
      is_reversed: false,
      glyphs: ['Wind', 'Star'],
      metrics: {
        author: pr.author,
        authorType: pr.authorType,
        headRefName: pr.headRefName,
        issueCount: pr.issueRefs.length,
      },
    };
  }

  // 2. Card II: The Crucible
  let crucible: TarotCardSpreadSlot;
  const isConflicting = pr.mergeable === 'CONFLICTING';
  const isChecksFailed = pr.checksStatus === 'failure';

  if (isConflicting || isChecksFailed) {
    crucible = {
      id: `tarot-${pr.number}-crucible`,
      position: 'crucible',
      title: 'II. The Crucible',
      arcana: 'The Tower',
      archetype: 'Sudden Collapse / Trial by Fire',
      element: 'fire',
      status: isConflicting ? 'MERGE_CONFLICT' : 'CI_FAILURE',
      is_reversed: true,
      glyphs: ['Flame', 'Skull', 'Sword'],
      metrics: {
        checksStatus: pr.checksStatus,
        mergeable: pr.mergeable,
        additions: pr.additions,
        deletions: pr.deletions,
      },
      action: { label: 'Resolve Crucible Trial', kind: 'resolve' },
    };
  } else if (pr.checksStatus === 'pending') {
    crucible = {
      id: `tarot-${pr.number}-crucible`,
      position: 'crucible',
      title: 'II. The Crucible',
      arcana: 'Temperance',
      archetype: 'Equilibrium in Motion',
      element: 'water',
      status: 'CHECKS_PENDING',
      is_reversed: false,
      glyphs: ['Droplets', 'Sparkles'],
      metrics: {
        checksStatus: pr.checksStatus,
        mergeable: pr.mergeable,
        additions: pr.additions,
        deletions: pr.deletions,
      },
    };
  } else {
    crucible = {
      id: `tarot-${pr.number}-crucible`,
      position: 'crucible',
      title: 'II. The Crucible',
      arcana: 'Wheel of Fortune',
      archetype: 'Destiny / Clean Alignment',
      element: 'aether',
      status: 'CRUCIBLE_CLEAN',
      is_reversed: false,
      glyphs: ['Star', 'Shield', 'Sparkles'],
      metrics: {
        checksStatus: pr.checksStatus,
        mergeable: pr.mergeable,
        additions: pr.additions,
        deletions: pr.deletions,
      },
    };
  }

  // 3. Card III: The Oracle
  let oracle: TarotCardSpreadSlot;
  if (isFlood) {
    oracle = {
      id: `tarot-${pr.number}-oracle`,
      position: 'oracle',
      title: 'III. The Oracle',
      arcana: 'Death',
      archetype: 'Purge & Regeneration',
      element: 'void',
      status: 'PURGE_RECOMMENDED',
      is_reversed: true,
      glyphs: ['Skull', 'RotateCcw'],
      metrics: {
        reviewDecision: pr.reviewDecision,
        state: pr.state,
      },
      action: { label: 'Nuke Flood PR', kind: 'nuke' },
    };
  } else if (pr.reviewDecision === 'APPROVED') {
    oracle = {
      id: `tarot-${pr.number}-oracle`,
      position: 'oracle',
      title: 'III. The Oracle',
      arcana: 'Judgment',
      archetype: 'Awakening / Final Absolution',
      element: 'aether',
      status: 'APPROVED',
      is_reversed: false,
      glyphs: ['Crown', 'Sparkles', 'Star'],
      metrics: {
        reviewDecision: pr.reviewDecision,
        state: pr.state,
      },
      action: { label: 'Merge Pull Request', kind: 'merge' },
    };
  } else if (pr.reviewDecision === 'CHANGES_REQUESTED') {
    oracle = {
      id: `tarot-${pr.number}-oracle`,
      position: 'oracle',
      title: 'III. The Oracle',
      arcana: 'Justice',
      archetype: 'Truth & Accountability',
      element: 'fire',
      status: 'CHANGES_REQUESTED',
      is_reversed: true,
      glyphs: ['Sword', 'Shield'],
      metrics: {
        reviewDecision: pr.reviewDecision,
        state: pr.state,
      },
      action: { label: 'Block Pull Request', kind: 'block' },
    };
  } else if (pr.isDraft) {
    oracle = {
      id: `tarot-${pr.number}-oracle`,
      position: 'oracle',
      title: 'III. The Oracle',
      arcana: 'The Moon',
      archetype: 'Incubation & Reflection',
      element: 'water',
      status: 'DRAFT_INCUBATION',
      is_reversed: false,
      glyphs: ['Droplets', 'Eye'],
      metrics: {
        reviewDecision: pr.reviewDecision,
        state: pr.state,
      },
      action: { label: 'Mark Ready for Review', kind: 'ready' },
    };
  } else {
    oracle = {
      id: `tarot-${pr.number}-oracle`,
      position: 'oracle',
      title: 'III. The Oracle',
      arcana: 'High Priestess',
      archetype: 'Intuition & Deliberation',
      element: 'water',
      status: 'REVIEW_REQUIRED',
      is_reversed: false,
      glyphs: ['Sparkles', 'Eye'],
      metrics: {
        reviewDecision: pr.reviewDecision,
        state: pr.state,
      },
      action: { label: 'Conduct Oracle Review', kind: 'review' },
    };
  }

  // 4. Overall Orientation & Explainer Arcana
  const isReversed = origin.is_reversed || crucible.is_reversed || oracle.is_reversed;
  const orientation: 'upright' | 'reversed' = isReversed ? 'reversed' : 'upright';

  let riskLevel: ExplainerArcana['risk_level'] = 'low';
  let verdict = 'Ready to merge: all trials passed.';

  if (isConflicting && isChecksFailed) {
    riskLevel = 'critical';
    verdict = 'Critical blockage: conflicting diff and failing CI checks.';
  } else if (isConflicting || isChecksFailed || pr.reviewDecision === 'CHANGES_REQUESTED') {
    riskLevel = 'high';
    verdict = 'Blocked by trials: resolve conflicts and failing checks before proceeding.';
  } else if (isFlood) {
    riskLevel = 'moderate';
    verdict = 'Automated bot flood pattern: nuke recommended to restore equilibrium.';
  } else if (pr.isDraft) {
    riskLevel = 'moderate';
    verdict = 'Draft work in progress: review once marked ready.';
  }

  const keyFiles = detail?.files?.map((f) => f.path) ?? [];

  const summary = detail?.body
    ? detail.body.slice(0, 180)
    : `${pr.title} by @${pr.author} (${pr.additions} additions, ${pr.deletions} deletions)`;

  return {
    spread_id: `tarot-pr-${pr.number}`,
    pr_number: pr.number,
    orientation,
    cards: { origin, crucible, oracle },
    explainer: {
      summary,
      risk_level: riskLevel,
      verdict,
      key_files: keyFiles,
    },
  };
}
