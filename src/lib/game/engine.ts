import type { PlayerState, PlayerStats, JobCard, OutfitCard, CompanionCard, TarotCard } from './types';

/**
 * Formula: XP_req(L) = floor(100 * L^1.65 + 50 * L)
 */
export function xpRequiredForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.65) + 50 * level);
}

/**
 * Add XP to a specific stat and calculate level-ups.
 */
export function addStatXP(
  stats: PlayerStats,
  statType: 'str' | 'int' | 'chm',
  amount: number
): { stats: PlayerStats; leveledUp: boolean } {
  const nextStats = { ...stats };
  let leveledUp = false;

  if (statType === 'str') {
    nextStats.str_xp += amount;
    while (nextStats.str_xp >= xpRequiredForLevel(nextStats.str_lvl)) {
      nextStats.str_xp -= xpRequiredForLevel(nextStats.str_lvl);
      nextStats.str_lvl += 1;
      leveledUp = true;
    }
  } else if (statType === 'int') {
    nextStats.int_xp += amount;
    while (nextStats.int_xp >= xpRequiredForLevel(nextStats.int_lvl)) {
      nextStats.int_xp -= xpRequiredForLevel(nextStats.int_lvl);
      nextStats.int_lvl += 1;
      leveledUp = true;
    }
  } else if (statType === 'chm') {
    nextStats.chm_xp += amount;
    while (nextStats.chm_xp >= xpRequiredForLevel(nextStats.chm_lvl)) {
      nextStats.chm_xp -= xpRequiredForLevel(nextStats.chm_lvl);
      nextStats.chm_lvl += 1;
      leveledUp = true;
    }
  }

  return { stats: nextStats, leveledUp };
}

/**
 * Check job promotion requirements.
 */
export function isJobEligible(job: JobCard, stats: PlayerStats): boolean {
  return (
    stats.str_lvl >= job.requirements.str &&
    stats.int_lvl >= job.requirements.int &&
    stats.chm_lvl >= job.requirements.chm &&
    stats.krm >= job.requirements.krm
  );
}

/**
 * Calculate shift earnings.
 */
export function calculateShiftPayout(
  job: JobCard,
  stats: PlayerStats,
  outfit?: OutfitCard,
  companion?: CompanionCard,
  tarotBuffs?: TarotCard[]
): number {
  const primaryStat =
    job.track === 'fast_food' || job.track === 'crime'
      ? stats.str_lvl
      : job.track === 'tech' || job.track === 'finance'
      ? stats.int_lvl
      : stats.chm_lvl;

  const statBonus = 1.0 + primaryStat / 100;
  const outfitBonus = outfit ? outfit.multipliers.payout_buff : 1.0;
  const companionBonus = companion ? companion.passive_perk.payout_multiplier : 1.0;

  let tarotBonus = 1.0;
  if (tarotBuffs) {
    for (const card of tarotBuffs) {
      if (card.id === '002') tarotBonus += 0.3; // High Priestess
    }
  }

  return Math.floor(job.base_payout * statBonus * outfitBonus * companionBonus * tarotBonus);
}

/**
 * Gacha Pity & Roll Logic.
 */
export function calculateSSRRate(pullsSinceSSR: number): number {
  if (pullsSinceSSR >= 90) return 1.0;
  if (pullsSinceSSR < 70) return 0.015;
  return Math.min(1.0, 0.015 + (pullsSinceSSR - 70) * 0.05);
}

export function rollGacha(
  pityPulls: number,
  rngSeed: number = Math.random()
): { rarity: 'R' | 'SR' | 'SSR'; nextPityPulls: number } {
  const currentPulls = pityPulls + 1;
  const ssrRate = calculateSSRRate(currentPulls);

  if (rngSeed < ssrRate) {
    return { rarity: 'SSR', nextPityPulls: 0 };
  } else if (rngSeed < ssrRate + 0.285) {
    return { rarity: 'SR', nextPityPulls: currentPulls };
  } else {
    return { rarity: 'R', nextPityPulls: currentPulls };
  }
}
