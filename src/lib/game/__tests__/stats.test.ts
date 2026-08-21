import { describe, it, expect } from 'vitest';
import { xpRequiredForLevel, addStatXP } from '../engine';
import { INITIAL_PLAYER_STATE } from '../types';

describe('Stats Engine', () => {
  it('computes exact XP required for level progression', () => {
    expect(xpRequiredForLevel(1)).toBe(150);
    expect(xpRequiredForLevel(2)).toBeGreaterThan(150);
  });

  it('handles XP addition and level-up overflow', () => {
    const stats = { ...INITIAL_PLAYER_STATE.stats };
    const { stats: updatedStats, leveledUp } = addStatXP(stats, 'str', 150);

    expect(leveledUp).toBe(true);
    expect(updatedStats.str_lvl).toBe(2);
    expect(updatedStats.str_xp).toBe(0);
  });
});
