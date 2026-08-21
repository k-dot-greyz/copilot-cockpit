import React from 'react';
import type { PlayerState } from '../../lib/game/types';

interface ForgeViewProps {
  state: PlayerState;
  onTrain: (statType: 'str' | 'int' | 'chm', xpGain: number, energyCost: number) => void;
}

export function ForgeView({ state, onTrain }: ForgeViewProps) {
  return (
    <div data-testid="hrpg-view-forge" className="section-group">
      <div className="section-header">
        <h2>⚒️ Forge — Stat Grinds & Dopamine Conditioning</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {/* Strength Gym */}
        <div className="card">
          <h3 style={{ color: 'var(--accent-red)' }}>🏋️ Iron Dungeon Gym</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.5rem 0' }}>
            Heavy benching and aggressive protein shake slamming to boost combat DPS and bouncer gigs.
          </p>
          <div style={{ margin: '1rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>Gain: <strong>+75 STR XP</strong></span> · <span>Cost: <strong>20 Energy</strong></span>
          </div>
          <button
            className="btn btn--primary"
            disabled={state.energy < 20}
            onClick={() => onTrain('str', 75, 20)}
          >
            Lift Weights
          </button>
        </div>

        {/* Intelligence Bootcamp */}
        <div className="card">
          <h3 style={{ color: 'var(--accent-blue)' }}>🧠 24/7 Neural Hackathon</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.5rem 0' }}>
            Grinding prompt engineering tokens and reverse-engineering smart contracts on 3 monitors.
          </p>
          <div style={{ margin: '1rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>Gain: <strong>+75 INT XP</strong></span> · <span>Cost: <strong>20 Energy</strong></span>
          </div>
          <button
            className="btn btn--primary"
            disabled={state.energy < 20}
            onClick={() => onTrain('int', 75, 20)}
          >
            Study Prompts
          </button>
        </div>

        {/* Charm Bar */}
        <div className="card">
          <h3 style={{ color: 'var(--accent-purple)' }}>🍸 Cyberpunk Speakeasy</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.5rem 0' }}>
            Practicing smooth corporate rizz, dating sim dialogue trees, and discount negotiations.
          </p>
          <div style={{ margin: '1rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>Gain: <strong>+75 CHM XP</strong></span> · <span>Cost: <strong>20 Energy</strong></span>
          </div>
          <button
            className="btn btn--primary"
            disabled={state.energy < 20}
            onClick={() => onTrain('chm', 75, 20)}
          >
            Schmooze & Flirt
          </button>
        </div>
      </div>
    </div>
  );
}
