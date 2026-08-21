import type { PlayerState, PlayerStats } from './types';

export const BIT_CASH = 0x01;
export const BIT_CRYPTO = 0x02;
export const BIT_ENERGY = 0x04;
export const BIT_STR_XP = 0x08;
export const BIT_INT_XP = 0x10;
export const BIT_CHM_XP = 0x20;
export const BIT_DGN = 0x40;
export const BIT_HOUR = 0x80;

export interface SysExDeltaPayload {
  cash?: number;
  crypto?: number;
  energy?: number;
  str_xp?: number;
  int_xp?: number;
  chm_xp?: number;
  dgn?: number;
  hour?: number;
}

export interface SysExDeltaPacket {
  header: '0xF0' | '0xF7';
  bitmask: number;
  timestamp: number;
  payload: SysExDeltaPayload;
}

/**
 * Computes a SysEx sparse delta packet between previous and current states.
 */
export function computeSysExDelta(
  prev: PlayerState,
  curr: PlayerState,
  timestamp: number = Date.now()
): SysExDeltaPacket {
  let bitmask = 0;
  const payload: SysExDeltaPayload = {};

  if (curr.cash !== prev.cash) {
    bitmask |= BIT_CASH;
    payload.cash = curr.cash;
  }
  if (curr.crypto !== prev.crypto) {
    bitmask |= BIT_CRYPTO;
    payload.crypto = curr.crypto;
  }
  if (curr.energy !== prev.energy) {
    bitmask |= BIT_ENERGY;
    payload.energy = curr.energy;
  }
  if (curr.stats.str_xp !== prev.stats.str_xp) {
    bitmask |= BIT_STR_XP;
    payload.str_xp = curr.stats.str_xp;
  }
  if (curr.stats.int_xp !== prev.stats.int_xp) {
    bitmask |= BIT_INT_XP;
    payload.int_xp = curr.stats.int_xp;
  }
  if (curr.stats.chm_xp !== prev.stats.chm_xp) {
    bitmask |= BIT_CHM_XP;
    payload.chm_xp = curr.stats.chm_xp;
  }
  if (curr.stats.dgn !== prev.stats.dgn) {
    bitmask |= BIT_DGN;
    payload.dgn = curr.stats.dgn;
  }
  if (curr.hour !== prev.hour) {
    bitmask |= BIT_HOUR;
    payload.hour = curr.hour;
  }

  return {
    header: '0xF7',
    bitmask,
    timestamp,
    payload,
  };
}

/**
 * Hydrates state by applying an incoming SysEx delta packet.
 */
export function applySysExDelta(
  state: PlayerState,
  packet: SysExDeltaPacket
): PlayerState {
  const next: PlayerState = {
    ...state,
    stats: { ...state.stats },
    inventory: { ...state.inventory },
    pity: { ...state.pity },
  };

  if (packet.bitmask & BIT_CASH && packet.payload.cash !== undefined) {
    next.cash = packet.payload.cash;
  }
  if (packet.bitmask & BIT_CRYPTO && packet.payload.crypto !== undefined) {
    next.crypto = packet.payload.crypto;
  }
  if (packet.bitmask & BIT_ENERGY && packet.payload.energy !== undefined) {
    next.energy = packet.payload.energy;
  }
  if (packet.bitmask & BIT_STR_XP && packet.payload.str_xp !== undefined) {
    next.stats.str_xp = packet.payload.str_xp;
  }
  if (packet.bitmask & BIT_INT_XP && packet.payload.int_xp !== undefined) {
    next.stats.int_xp = packet.payload.int_xp;
  }
  if (packet.bitmask & BIT_CHM_XP && packet.payload.chm_xp !== undefined) {
    next.stats.chm_xp = packet.payload.chm_xp;
  }
  if (packet.bitmask & BIT_DGN && packet.payload.dgn !== undefined) {
    next.stats.dgn = packet.payload.dgn;
  }
  if (packet.bitmask & BIT_HOUR && packet.payload.hour !== undefined) {
    next.hour = packet.payload.hour;
  }

  return next;
}
