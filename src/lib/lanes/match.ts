import type { PR } from '../github';
import type { LaneCard } from '../config/cockpit';

export type AssignedLanes = Record<string, PR[]>;

function matcherHits(pr: PR, matcher: LaneCard['matchers'][number], floodNumbers: Set<number>): boolean {
  switch (matcher.type) {
    case 'flood':
      return floodNumbers.has(pr.number);
    case 'authorType':
      return pr.authorType === matcher.value;
    case 'isDraft':
      return pr.isDraft === Boolean(matcher.value);
    case 'titlePrefix':
      return typeof matcher.value === 'string' && pr.title.startsWith(matcher.value);
    case 'refContains':
      return typeof matcher.value === 'string' && pr.headRefName.includes(matcher.value);
    case 'label':
      return typeof matcher.value === 'string' && pr.labels.includes(matcher.value);
    default:
      return false;
  }
}

export function matchLane(pr: PR, lane: LaneCard, floodNumbers: Set<number>): boolean {
  if (lane.require?.authorType && pr.authorType !== lane.require.authorType) {
    return false;
  }
  if (typeof lane.require?.isDraft === 'boolean' && pr.isDraft !== lane.require.isDraft) {
    return false;
  }
  if (lane.matchers.length === 0) return true;
  if (lane.match === 'any') {
    return lane.matchers.some((matcher) => matcherHits(pr, matcher, floodNumbers));
  }
  return lane.matchers.every((matcher) => matcherHits(pr, matcher, floodNumbers));
}

/**
 * Assign each PR to the first matching lane.
 * Lanes are tried by matchPriority (asc) then visual order.
 */
export function assignLanes(prs: PR[], lanes: LaneCard[], floodNumbers: Set<number>): AssignedLanes {
  const ranked = [...lanes].sort((a, b) => {
    if (a.matchPriority !== b.matchPriority) return a.matchPriority - b.matchPriority;
    return a.order - b.order;
  });
  const assigned: AssignedLanes = {};
  for (const lane of lanes) assigned[lane.id] = [];

  for (const pr of prs) {
    const lane = ranked.find((candidate) => matchLane(pr, candidate, floodNumbers));
    if (lane) assigned[lane.id].push(pr);
  }

  for (const lane of lanes) {
    assigned[lane.id].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  return assigned;
}
