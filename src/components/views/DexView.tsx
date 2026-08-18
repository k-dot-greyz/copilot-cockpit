import React from 'react';
import type { PlayerState, OutfitCard, CompanionCard } from '../../lib/game/types';

interface DexViewProps {
  state: PlayerState;
  outfits: OutfitCard[];
  companions: CompanionCard[];
  onEquipOutfit: (outfitId: string) => void;
}

export function DexView({ state, outfits, companions, onEquipOutfit }: DexViewProps) {
  return (
    <div data-testid="hrpg-view-dex" className="section-group">
      <div className="section-header">
        <h2>📖 Dex — Wardrobe & Companion Archive</h2>
      </div>

      {/* Outfits Collection */}
      <h3 style={{ color: 'var(--accent-purple)', marginBottom: '1rem' }}>👗 Unlocked Outfits</h3>
      <div className="pr-grid" style={{ marginBottom: 'var(--space-2xl)' }}>
        {outfits.map((outfit) => {
          const isUnlocked = state.inventory.outfit_ids.includes(outfit.id);
          const isEquipped = state.inventory.equipped_outfit_id === outfit.id;

          return (
            <div
              key={outfit.id}
              className={`card ${isEquipped ? 'card--active' : ''}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                alignItems: 'center',
                opacity: isUnlocked ? 1 : 0.4,
              }}
            >
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <h3>{outfit.name}</h3>
                  <span className={`badge ${outfit.rarity === 'SSR' ? 'badge--ready' : 'badge--draft'}`}>
                    {outfit.rarity} · {outfit.element}
                  </span>
                  {isEquipped && <span className="badge badge--human">Equipped</span>}
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{outfit.desc}</p>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>STR: +{Math.round((outfit.multipliers.str_buff - 1) * 100)}%</span>
                  <span>INT: +{Math.round((outfit.multipliers.int_buff - 1) * 100)}%</span>
                  <span>CHM: +{Math.round((outfit.multipliers.chm_buff - 1) * 100)}%</span>
                  <span>Payout: +{Math.round((outfit.multipliers.payout_buff - 1) * 100)}%</span>
                </div>
              </div>

              <div>
                <button
                  className="btn btn--sm"
                  disabled={!isUnlocked || isEquipped}
                  onClick={() => onEquipOutfit(outfit.id)}
                >
                  {isEquipped ? 'Active' : isUnlocked ? 'Equip' : 'Locked'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Companions Collection */}
      <h3 style={{ color: 'var(--accent-cyan)', marginBottom: '1rem' }}>💖 Harem & Otome Companions</h3>
      <div className="pr-grid">
        {companions.map((companion) => {
          const isUnlocked = state.inventory.companion_ids.includes(companion.id);

          return (
            <div
              key={companion.id}
              className="card"
              style={{
                opacity: isUnlocked ? 1 : 0.5,
              }}
            >
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <h3>{companion.name}</h3>
                <span className="badge badge--bot">{companion.title}</span>
                <span className="badge badge--ready">{companion.element}</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{companion.bio}</p>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', marginTop: '0.5rem' }}>
                ✨ Passive: <strong>{companion.passive_perk.name}</strong> ({companion.passive_perk.payout_multiplier}x Payout, {companion.passive_perk.xp_multiplier}x XP)
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
