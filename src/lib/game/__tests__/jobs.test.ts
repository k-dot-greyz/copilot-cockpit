import { describe, it, expect } from 'vitest';
import { isJobEligible, calculateShiftPayout } from '../engine';
import type { JobCard, OutfitCard } from '../types';
import { INITIAL_PLAYER_STATE } from '../types';

describe('Job Board Engine', () => {
  const promptJob: JobCard = {
    id: 'job_prompt_eng',
    title: 'Prompt Engineer',
    track: 'tech',
    tier: 2,
    base_payout: 100,
    energy_cost: 20,
    hours: 4,
    description: 'Synthesize prompts',
    requirements: {
      str: 1,
      int: 3,
      chm: 2,
      krm: 0,
    },
  };

  it('validates promotion requirements correctly', () => {
    const stats = { ...INITIAL_PLAYER_STATE.stats };
    expect(isJobEligible(promptJob, stats)).toBe(false);

    stats.int_lvl = 3;
    stats.chm_lvl = 2;
    expect(isJobEligible(promptJob, stats)).toBe(true);
  });

  it('applies stat and outfit multipliers to shift payout', () => {
    const stats = { ...INITIAL_PLAYER_STATE.stats, int_lvl: 50 }; // +50%
    const outfit: OutfitCard = {
      id: 'maid',
      name: 'Maid Tuxedo',
      rarity: 'SSR',
      element: 'aether',
      desc: 'Dapper',
      multipliers: {
        str_buff: 1.0,
        int_buff: 1.0,
        chm_buff: 1.0,
        payout_buff: 1.5,
        degen_buff: 1.0,
      },
    };

    // 100 * (1 + 0.5) * 1.5 = 100 * 1.5 * 1.5 = 225
    const payout = calculateShiftPayout(promptJob, stats, outfit);
    expect(payout).toBe(225);
  });
});
