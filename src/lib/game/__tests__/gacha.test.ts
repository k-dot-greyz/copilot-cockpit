import { describe, it, expect } from 'vitest';
import { calculateSSRRate, rollGacha } from '../engine';

describe('Gacha Pity Engine', () => {
  it('calculates soft and hard pity rates', () => {
    expect(calculateSSRRate(0)).toBe(0.015);
    expect(calculateSSRRate(69)).toBe(0.015);
    expect(calculateSSRRate(75)).toBeGreaterThan(0.015);
    expect(calculateSSRRate(90)).toBe(1.0);
  });

  it('guarantees SSR at hard pity pull', () => {
    const result = rollGacha(89, 0.999);
    expect(result.rarity).toBe('SSR');
    expect(result.nextPityPulls).toBe(0);
  });
});
