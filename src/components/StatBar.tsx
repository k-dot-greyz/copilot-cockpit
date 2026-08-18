import React from 'react';
import type { PlayerState } from '../lib/game/types';
import { xpRequiredForLevel } from '../lib/game/engine';

export function StatBar({ state }: { state: PlayerState }) {
  const strReq = xpRequiredForLevel(state.stats.str_lvl);
  const intReq = xpRequiredForLevel(state.stats.int_lvl);
  const chmReq = xpRequiredForLevel(state.stats.chm_lvl);

  return (
    <div className="stat-bar" data-testid="hrpg-stat-bar" role="region" aria-label="Player Stats HUD">
      {/* Cash & Crypto */}
      <div className="stat-item" data-testid="hrpg-stat-cash">
        <span className="stat-value" style={{ color: 'var(--accent-green)' }}>
          ${state.cash}
        </span>
        <span className="stat-label">Fiat Cash</span>
      </div>

      <div className="stat-item" data-testid="hrpg-stat-energy">
        <span className="stat-value" style={{ color: state.energy < 20 ? 'var(--accent-red)' : 'var(--accent-cyan)' }}>
          {state.energy}/100
        </span>
        <span className="stat-label">⚡ Energy</span>
      </div>

      {/* STR */}
      <div className="stat-item" data-testid="hrpg-stat-str">
        <span className="stat-value" style={{ color: 'var(--accent-red)' }}>
          L{state.stats.str_lvl}
        </span>
        <span className="stat-label">STR ({state.stats.str_xp}/{strReq})</span>
      </div>

      {/* INT */}
      <div className="stat-item" data-testid="hrpg-stat-int">
        <span className="stat-value" style={{ color: 'var(--accent-blue)' }}>
          L{state.stats.int_lvl}
        </span>
        <span className="stat-label">INT ({state.stats.int_xp}/{intReq})</span>
      </div>

      {/* CHM */}
      <div className="stat-item" data-testid="hrpg-stat-chm">
        <span className="stat-value" style={{ color: 'var(--accent-purple)' }}>
          L{state.stats.chm_lvl}
        </span>
        <span className="stat-label">CHM ({state.stats.chm_xp}/{chmReq})</span>
      </div>

      {/* DGN Score */}
      <div className="stat-item" data-testid="hrpg-stat-dgn">
        <span className="stat-value" style={{ color: 'var(--accent-amber)' }}>
          {state.stats.dgn}
        </span>
        <span className="stat-label">🔥 Degen</span>
      </div>
    </div>
  );
}
