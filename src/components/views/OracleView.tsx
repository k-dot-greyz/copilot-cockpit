import React, { useState } from 'react';
import type { PlayerState, OutfitCard, TarotCard } from '../../lib/game/types';
import { rollGacha } from '../../lib/game/engine';

interface OracleViewProps {
  state: PlayerState;
  outfits: OutfitCard[];
  tarotCards: TarotCard[];
  onPullGacha: (rarity: 'R' | 'SR' | 'SSR', nextPity: number) => void;
  onDrawTarot: (cardIds: string[]) => void;
}

export function OracleView({
  state,
  outfits,
  tarotCards,
  onPullGacha,
  onDrawTarot,
}: OracleViewProps) {
  const [pullResult, setPullResult] = useState<string | null>(null);

  const handlePull = () => {
    if (state.cash < 100) return;
    const res = rollGacha(state.pity.banner_pulls);
    onPullGacha(res.rarity, res.nextPityPulls);
    setPullResult(`Pulled a ${res.rarity} tier card!`);
  };

  const handleDrawDailyTarot = () => {
    // Select 3 random unique tarot cards
    const shuffled = [...tarotCards].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3).map((c) => c.id);
    onDrawTarot(selected);
  };

  return (
    <div data-testid="hrpg-view-oracle" className="section-group">
      <div className="section-header">
        <h2>🔮 Oracle — Gacha Banners & Tarot Divination</h2>
      </div>

      {/* Gacha Banner Crate */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ color: 'var(--accent-purple)' }}>✨ Consoomer Fever & Maid Ascendancy Banner</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Base SSR Rate: 1.5% · Soft Pity @ 70 · Guaranteed SSR @ 90
            </p>
            <div style={{ marginTop: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }} data-testid="hrpg-gacha-pity-counter">
              <span>Pity Counter: <strong>{state.pity.banner_pulls}/90</strong></span>
            </div>
          </div>
          <button
            className="btn btn--primary"
            onClick={handlePull}
            disabled={state.cash < 100}
            data-testid="hrpg-gacha-pull-1"
          >
            Pull Crate ($100)
          </button>
        </div>

        {pullResult && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: 'var(--accent-purple-dim)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--accent-purple)',
              fontFamily: 'var(--font-mono)',
            }}
            role="status"
          >
            🎉 {pullResult}
          </div>
        )}
      </div>

      {/* Daily Tarot Spread */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ color: 'var(--accent-cyan)' }}>🃏 Daily 3-Card Tarot Divination</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Volatile daily archetype modifiers active for today's clock cycle.
            </p>
          </div>
          <button className="btn" onClick={handleDrawDailyTarot} data-testid="hrpg-tarot-draw-btn">
            Draw Spread
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {state.inventory.active_tarot_buffs.map((cardId) => {
            const card = tarotCards.find((c) => c.id === cardId);
            if (!card) return null;
            return (
              <div
                key={card.id}
                data-testid={`hrpg-tarot-card-${card.id}`}
                style={{
                  padding: '1rem',
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-active)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: 'var(--accent-purple)' }}>{card.name}</strong>
                  <span className="badge badge--ready">{card.type}</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.5rem 0' }}>{card.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
