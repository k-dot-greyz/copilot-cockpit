export interface CockpitTarget {
  owner: string;
  repo: string;
}

export interface CockpitAuth {
  tokenKey: string;
}

export interface CockpitTeam {
  humanLogins: string[];
}

export interface CockpitFlood {
  minCount: number;
}

export interface CockpitRateLimit {
  warnRemaining: number;
}

export type MatcherType =
  | 'authorType'
  | 'isDraft'
  | 'flood'
  | 'titlePrefix'
  | 'refContains'
  | 'label';

export interface LaneMatcher {
  type: MatcherType;
  value?: string | boolean;
}

export interface LaneCard {
  id: string;
  title: string;
  emoji: string;
  accent: string;
  order: number;
  matchPriority: number;
  match: 'all' | 'any';
  require?: { authorType?: 'human' | 'bot' | 'external'; isDraft?: boolean };
  matchers: LaneMatcher[];
}

export interface ActionCard {
  id: string;
  title: string;
  kind: string;
  confirm: boolean;
}

export interface CockpitConfig {
  dex_id: string;
  schema: string;
  title: string;
  target: CockpitTarget;
  auth: CockpitAuth;
  team: CockpitTeam;
  flood: CockpitFlood;
  rateLimit: CockpitRateLimit;
}

export interface ParsedCockpit {
  title: string;
  target: CockpitTarget;
  auth: CockpitAuth;
  team: CockpitTeam;
  flood: CockpitFlood;
  rateLimit: CockpitRateLimit;
  lanes: LaneCard[];
  actions: ActionCard[];
}

function requireNonEmpty(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Cockpit config missing ${label}`);
  }
  return value.trim();
}

function parseLane(raw: unknown): LaneCard {
  const lane = raw as LaneCard;
  if (!lane || typeof lane !== 'object' || !lane.id) {
    throw new Error('Lane card missing id');
  }
  return {
    id: String(lane.id),
    title: String(lane.title ?? lane.id),
    emoji: String(lane.emoji ?? ''),
    accent: String(lane.accent ?? 'bot'),
    order: typeof lane.order === 'number' ? lane.order : 0,
    matchPriority: typeof lane.matchPriority === 'number' ? lane.matchPriority : 1,
    match: lane.match === 'any' ? 'any' : 'all',
    require: lane.require,
    matchers: Array.isArray(lane.matchers) ? lane.matchers : [],
  };
}

function parseAction(raw: unknown): ActionCard {
  const action = raw as ActionCard;
  if (!action || typeof action !== 'object' || !action.id) {
    throw new Error('Action card missing id');
  }
  return {
    id: String(action.id),
    title: String(action.title ?? action.id),
    kind: String(action.kind ?? 'command'),
    confirm: Boolean(action.confirm),
  };
}

export function parseCockpit(input: {
  config: CockpitConfig;
  lanes: unknown[];
  actions: unknown[];
  targetOverride?: CockpitTarget | null;
}): ParsedCockpit {
  const { config } = input;
  const owner = requireNonEmpty(config?.target?.owner, 'owner');
  const repo = requireNonEmpty(config?.target?.repo, 'repo');
  const override = input.targetOverride;
  const target =
    override && override.owner && override.repo
      ? { owner: requireNonEmpty(override.owner, 'override owner'), repo: requireNonEmpty(override.repo, 'override repo') }
      : { owner, repo };

  const humanLogins = Array.isArray(config.team?.humanLogins)
    ? config.team.humanLogins.filter((login) => typeof login === 'string' && login.length > 0)
    : [];

  const lanes = input.lanes.map(parseLane).sort((a, b) => a.order - b.order);

  return {
    title: typeof config.title === 'string' ? config.title : 'Cockpit',
    target,
    auth: {
      tokenKey: requireNonEmpty(config.auth?.tokenKey, 'auth.tokenKey'),
    },
    team: { humanLogins },
    flood: {
      minCount: typeof config.flood?.minCount === 'number' ? config.flood.minCount : 10,
    },
    rateLimit: {
      warnRemaining:
        typeof config.rateLimit?.warnRemaining === 'number' ? config.rateLimit.warnRemaining : 50,
    },
    lanes,
    actions: input.actions.map(parseAction),
  };
}
