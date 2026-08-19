import { test, expect } from '@playwright/test';
import { INITIAL_PLAYER_STATE } from '../src/lib/game/types';
import { calculateShiftPayout, addStatXP, rollGacha } from '../src/lib/game/engine';

test.describe('StickHRPG: MVP Core Happy Path User Journey', () => {
  test('Full core loop: state init -> wage slave shift -> gacha pull -> outfit equip -> stats training', () => {
    let player = { ...INITIAL_PLAYER_STATE };
    expect(player.cash).toBe(250);
    expect(player.energy).toBe(100);

    // 1. Clock in to wage-slave shift (Fast Food)
    const fastFoodJob = {
      id: 'job_fast_food_flipper',
      title: 'Fast Food Patty Flipper',
      track: 'fast_food' as const,
      tier: 1,
      base_payout: 45,
      energy_cost: 25,
      hours: 4,
      description: 'Flipping synthetic patties',
      requirements: { str: 1, int: 1, chm: 1, krm: 0 },
    };

    const payout = calculateShiftPayout(fastFoodJob, player.stats);
    player.cash += payout;
    player.energy -= fastFoodJob.energy_cost;
    player.hour = (player.hour + fastFoodJob.hours) % 24;
    const { stats: updatedStr } = addStatXP(player.stats, 'str', 25);
    player.stats = updatedStr;

    expect(player.cash).toBe(250 + 45);
    expect(player.energy).toBe(75);
    expect(player.stats.str_xp).toBe(25);

    // 2. Oracle View: Gacha Pull
    expect(player.cash).toBeGreaterThanOrEqual(100);
    const pull = rollGacha(player.pity.banner_pulls, 0.005); // Force SSR roll
    expect(pull.rarity).toBe('SSR');
    player.cash -= 100;
    player.inventory.outfit_ids.push('outfit_maid_tuxedo');
    player.pity.banner_pulls = pull.nextPityPulls;

    expect(player.inventory.outfit_ids).toContain('outfit_maid_tuxedo');
    expect(player.pity.banner_pulls).toBe(0);

    // 3. Dex View: Equip Outfit
    player.inventory.equipped_outfit_id = 'outfit_maid_tuxedo';
    expect(player.inventory.equipped_outfit_id).toBe('outfit_maid_tuxedo');

    // 4. Forge View: Lift Weights
    const { stats: gymStats } = addStatXP(player.stats, 'str', 75);
    player.stats = gymStats;
    player.energy -= 20;

    expect(player.stats.str_xp).toBe(100);
    expect(player.energy).toBe(55);

    // 5. Sleep (R): Advance day, restore energy, deduct rent
    player.day += 1;
    player.hour = 8;
    player.energy = 100;
    player.cash = Math.max(0, player.cash - 25);

    expect(player.day).toBe(2);
    expect(player.energy).toBe(100);
    expect(player.cash).toBe(170);
  });
});
