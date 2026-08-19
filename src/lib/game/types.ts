export interface PlayerStats {
  str_lvl: number;
  str_xp: number;
  int_lvl: number;
  int_xp: number;
  chm_lvl: number;
  chm_xp: number;
  krm: number;
  dgn: number;
}

export interface Inventory {
  outfit_ids: string[];
  equipped_outfit_id: string | null;
  companion_ids: string[];
  active_companion_id: string | null;
  active_tarot_buffs: string[];
}

export interface GachaPityState {
  banner_pulls: number;
  guaranteed_featured: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  day: number;
  hour: number;
  energy: number;
  cash: number;
  crypto: number;
  stats: PlayerStats;
  inventory: Inventory;
  pity: GachaPityState;
}

export interface JobCard {
  id: string;
  title: string;
  track: 'fast_food' | 'tech' | 'finance' | 'crime';
  tier: number;
  base_payout: number;
  energy_cost: number;
  hours: number;
  description: string;
  requirements: {
    str: number;
    int: number;
    chm: number;
    krm: number;
  };
}

export interface OutfitCard {
  id: string;
  name: string;
  rarity: 'R' | 'SR' | 'SSR' | 'UR';
  element: 'void' | 'fire' | 'water' | 'aether';
  desc: string;
  icon?: string;
  multipliers: {
    str_buff: number;
    int_buff: number;
    chm_buff: number;
    payout_buff: number;
    degen_buff: number;
  };
}

export interface CompanionCard {
  id: string;
  name: string;
  title: string;
  element: 'void' | 'fire' | 'water' | 'aether';
  rarity: 'SR' | 'SSR' | 'UR';
  affinity_level: number;
  bio: string;
  passive_perk: {
    name: string;
    payout_multiplier: number;
    xp_multiplier: number;
    energy_reduction: number;
  };
}

export interface EncounterChoice {
  text: string;
  requirements: {
    chm?: number;
    krm?: number;
    dgn?: number;
  };
  outcomes: {
    cash_delta?: number;
    energy_delta?: number;
    chm_xp?: number;
    krm_delta?: number;
    dgn_delta?: number;
    affinity_companion_id?: string;
    affinity_gain?: number;
  };
}

export interface EncounterCard {
  id: string;
  title: string;
  speaker: string;
  narrative: string;
  choices: EncounterChoice[];
}

export interface TarotCard {
  id: string;
  name: string;
  sub: string;
  type: 'void' | 'fire' | 'water' | 'aether';
  stats: {
    atk: number;
    def: number;
    spd: number;
  };
  desc: string;
  icon: string;
}

export const INITIAL_PLAYER_STATE: PlayerState = {
  id: 'player_001',
  name: 'Cultured Consoomer',
  day: 1,
  hour: 8,
  energy: 100,
  cash: 250,
  crypto: 0,
  stats: {
    str_lvl: 1,
    str_xp: 0,
    int_lvl: 1,
    int_xp: 0,
    chm_lvl: 1,
    chm_xp: 0,
    krm: 0,
    dgn: 0,
  },
  inventory: {
    outfit_ids: ['outfit_tracksuit'],
    equipped_outfit_id: 'outfit_tracksuit',
    companion_ids: [],
    active_companion_id: null,
    active_tarot_buffs: ['000'],
  },
  pity: {
    banner_pulls: 0,
    guaranteed_featured: false,
  },
};
