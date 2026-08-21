import React, { useState } from 'react';
import type { PlayerState } from '../lib/game/types';

interface CasinoProps {
  state: PlayerState;
  onCashout: (pot: number, degenGain: number) => void;
  onBust: (energyPenalty: number) => void;
}

export function CasinoMiniGame({ state, onCashout, onBust }: CasinoProps) {
  const [bet, setBet] = useState(25);
  const [round, setRound] = useState(0);
  const [pot, setPot] = useState(0);
  const [isBusted, setIsBusted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const startRound = () => {
    if (state.cash < bet) return;
    setIsPlaying(true);
    setIsBusted(false);
    setRound(1);
    setPot(bet * 2);
  };

  const handleEdge = () => {
    // Bust probability: 15% + (round-1)*8% capped at 85%
    const bustChance = Math.min(0.15 + (round - 1) * 0.08, 0.85);
    const roll = Math.random();

    if (roll < bustChance) {
      setIsBusted(true);
      setIsPlaying(false);
      setPot(0);
      onBust(10);
    } else {
      setRound((r) => r + 1);
      setPot((p) => p * 2);
    }
  };

  const handleBankCashout = () => {
    onCashout(pot, round * 25);
    setIsPlaying(false);
    setPot(0);
    setRound(0);
  };

  return (
    <div className="flood-alert" style={{ marginBottom: 'var(--space-2xl)' }} data-testid="hrpg-casino-container">
      <div className="flood-alert__header">
        <div>
          <h3 style={{ color: 'var(--accent-red)' }}>🎰 The Degen Edge Ladder (Multiplier 2ⁿ)</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Consecutive double-or-nothing rolls. Busting incurs -100% pot liquidation & Existential Dread.
          </p>
        </div>

        {!isPlaying ? (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bet:</span>
            <input
              type="number"
              className="input"
              style={{ width: '80px', padding: '0.3rem' }}
              value={bet}
              onChange={(e) => setBet(Math.max(10, parseInt(e.target.value) || 10))}
              data-testid="hrpg-casino-bet-input"
            />
            <button
              className="btn btn--danger"
              disabled={state.cash < bet}
              onClick={startRound}
              data-testid="hrpg-casino-spin-btn"
            >
              Start Edging
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn--danger"
              onClick={handleEdge}
              data-testid="hrpg-casino-spin-btn"
            >
              🎲 Double Pot (Round {round + 1})
            </button>
            <button
              className="btn btn--primary"
              onClick={handleBankCashout}
              data-testid="hrpg-casino-cashout-btn"
            >
              💰 Cashout ${pot}
            </button>
          </div>
        )}
      </div>

      {isPlaying && (
        <div style={{ marginTop: '1rem', fontFamily: 'var(--font-mono)' }} data-testid="hrpg-casino-pot-value">
          <span style={{ color: 'var(--accent-green)', fontSize: '1.25rem' }}>Current Pot: ${pot}</span> ·{' '}
          <span style={{ color: 'var(--accent-amber)' }}>Multiplier: {Math.pow(2, round)}x</span>
        </div>
      )}

      {isBusted && (
        <div style={{ marginTop: '1rem', color: 'var(--accent-red)', fontFamily: 'var(--font-mono)' }} role="alert">
          💥 BUSTED! Liquidated entire pot. Incurred Existential Dread (-10 Energy).
        </div>
      )}
    </div>
  );
}
