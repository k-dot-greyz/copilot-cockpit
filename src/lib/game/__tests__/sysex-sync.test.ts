import { describe, it, expect } from 'vitest';
import { computeSysExDelta, applySysExDelta, BIT_CASH, BIT_ENERGY } from '../sysex-sync';
import { INITIAL_PLAYER_STATE } from '../types';

describe('SysEx State Sync Protocol', () => {
  it('computes compact bitmask delta from state changes', () => {
    const prev = { ...INITIAL_PLAYER_STATE };
    const curr = {
      ...prev,
      cash: 1000,
      energy: 80,
    };

    const delta = computeSysExDelta(prev, curr, 123456789);
    expect(delta.bitmask).toBe(BIT_CASH | BIT_ENERGY);
    expect(delta.payload.cash).toBe(1000);
    expect(delta.payload.energy).toBe(80);
  });

  it('hydrates target state from sparse delta without mutating untouched keys', () => {
    const prev = { ...INITIAL_PLAYER_STATE };
    const delta = {
      header: '0xF7' as const,
      bitmask: BIT_CASH,
      timestamp: Date.now(),
      payload: { cash: 750 },
    };

    const next = applySysExDelta(prev, delta);
    expect(next.cash).toBe(750);
    expect(next.energy).toBe(prev.energy); // Untouched
  });
});
