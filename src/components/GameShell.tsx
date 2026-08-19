import React, { useState, useEffect, useCallback } from 'react';
import type { PlayerState, JobCard, OutfitCard, CompanionCard, TarotCard, EncounterCard } from '../lib/game/types';
import { INITIAL_PLAYER_STATE } from '../lib/game/types';
import { calculateShiftPayout, addStatXP } from '../lib/game/engine';
import { StatBar } from './StatBar';
import { ArenaView } from './views/ArenaView';
import { DexView } from './views/DexView';
import { OracleView } from './views/OracleView';
import { ForgeView } from './views/ForgeView';
import { CasinoMiniGame } from './CasinoMiniGame';
import { EncounterModal } from './EncounterModal';

// Seed Fixtures
import fastFoodJob from '../../content/cards/jobs/fast_food_flipper.json';
import promptJob from '../../content/cards/jobs/prompt_engineer.json';
import shadowJob from '../../content/cards/jobs/shadow_ceo.json';
import maidOutfit from '../../content/cards/outfits/maid_tuxedo.json';
import cyberBunnyOutfit from '../../content/cards/outfits/cyber_bunny.json';
import tracksuitOutfit from '../../content/cards/outfits/tracksuit.json';
import techSenpai from '../../content/cards/companions/tech_lead_senpai.json';
import yandereCrypto from '../../content/cards/companions/yandere_crypto_bro.json';
import foolTarot from '../../content/cards/tarot/the_fool_000.json';
import magicianTarot from '../../content/cards/tarot/the_magician_001.json';
import priestessTarot from '../../content/cards/tarot/high_priestess_002.json';
import watercoolerEncounter from '../../content/cards/encounters/awkward_watercooler.json';
import alleyEncounter from '../../content/cards/encounters/back_alley_deal.json';

const JOBS_DATA: JobCard[] = [fastFoodJob as JobCard, promptJob as JobCard, shadowJob as JobCard];
const OUTFITS_DATA: OutfitCard[] = [maidOutfit as OutfitCard, cyberBunnyOutfit as OutfitCard, tracksuitOutfit as OutfitCard];
const COMPANIONS_DATA: CompanionCard[] = [techSenpai as CompanionCard, yandereCrypto as CompanionCard];
const TAROT_DATA: TarotCard[] = [foolTarot as TarotCard, magicianTarot as TarotCard, priestessTarot as TarotCard];
const ENCOUNTERS_DATA: EncounterCard[] = [watercoolerEncounter as EncounterCard, alleyEncounter as EncounterCard];

export function GameShell() {
  const [state, setState] = useState<PlayerState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stickhrpg_save');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { /* ignore */ }
      }
    }
    return INITIAL_PLAYER_STATE;
  });

  const [activeTab, setActiveTab] = useState<'dex' | 'arena' | 'oracle' | 'forge'>('arena');
  const [activeEncounter, setActiveEncounter] = useState<EncounterCard | null>(null);

  // Auto-save
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('stickhrpg_save', JSON.stringify(state));
    }
  }, [state]);

  // Keyboard navigation shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    if (e.key === '1') setActiveTab('dex');
    if (e.key === '2') setActiveTab('arena');
    if (e.key === '3') setActiveTab('oracle');
    if (e.key === '4') setActiveTab('forge');
    if (e.key === 'r' || e.key === 'R') handleSleep();
    if (e.key === 'e' || e.key === 'E') triggerRandomEncounter();
  }, [state]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const triggerRandomEncounter = () => {
    const enc = ENCOUNTERS_DATA[Math.floor(Math.random() * ENCOUNTERS_DATA.length)];
    setActiveEncounter(enc);
  };

  const handleSleep = () => {
    setState((prev) => ({
      ...prev,
      day: prev.day + 1,
      hour: 8,
      energy: 100,
      cash: Math.max(0, prev.cash - 25), // daily rent
    }));
  };

  const handleClockIn = (job: JobCard) => {
    const equippedOutfit = OUTFITS_DATA.find((o) => o.id === state.inventory.equipped_outfit_id);
    const activeCompanion = COMPANIONS_DATA.find((c) => c.id === state.inventory.active_companion_id);
    const activeTarot = TAROT_DATA.filter((t) => state.inventory.active_tarot_buffs.includes(t.id));

    const payout = calculateShiftPayout(job, state.stats, equippedOutfit, activeCompanion, activeTarot);

    setState((prev) => {
      let statUpdate = { ...prev.stats };
      if (job.track === 'fast_food' || job.track === 'crime') {
        statUpdate = addStatXP(statUpdate, 'str', 25).stats;
      } else if (job.track === 'tech' || job.track === 'finance') {
        statUpdate = addStatXP(statUpdate, 'int', 25).stats;
      }

      return {
        ...prev,
        cash: prev.cash + payout,
        energy: Math.max(0, prev.energy - job.energy_cost),
        hour: (prev.hour + job.hours) % 24,
        stats: statUpdate,
      };
    });

    // 40% chance of triggering random visual novel dialogue encounter after shift
    if (Math.random() < 0.4) {
      triggerRandomEncounter();
    }
  };

  const handleSelectChoice = (encounter: EncounterCard, choiceIndex: number) => {
    const choice = encounter.choices[choiceIndex];
    if (!choice) return;

    setState((prev) => {
      const outcomes = choice.outcomes;
      const cashDelta = outcomes.cash_delta || 0;
      const energyDelta = outcomes.energy_delta || 0;
      const krmDelta = outcomes.krm_delta || 0;
      const dgnDelta = outcomes.dgn_delta || 0;
      const chmXp = outcomes.chm_xp || 0;

      let statUpdate = { ...prev.stats };
      if (chmXp > 0) {
        statUpdate = addStatXP(statUpdate, 'chm', chmXp).stats;
      }
      statUpdate.krm = Math.max(-100, Math.min(100, statUpdate.krm + krmDelta));
      statUpdate.dgn = Math.max(0, Math.min(10000, statUpdate.dgn + dgnDelta));

      return {
        ...prev,
        cash: Math.max(0, prev.cash + cashDelta),
        energy: Math.max(0, Math.min(100, prev.energy + energyDelta)),
        stats: statUpdate,
      };
    });

    setActiveEncounter(null);
  };

  const handleTrain = (statType: 'str' | 'int' | 'chm', xpGain: number, energyCost: number) => {
    setState((prev) => {
      const { stats } = addStatXP(prev.stats, statType, xpGain);
      return {
        ...prev,
        energy: Math.max(0, prev.energy - energyCost),
        hour: (prev.hour + 2) % 24,
        stats,
      };
    });
  };

  const handlePullGacha = (rarity: 'R' | 'SR' | 'SSR', nextPity: number) => {
    setState((prev) => {
      const newInventory = { ...prev.inventory };
      if (rarity === 'SSR' && !newInventory.outfit_ids.includes('outfit_maid_tuxedo')) {
        newInventory.outfit_ids = [...newInventory.outfit_ids, 'outfit_maid_tuxedo'];
      } else if (rarity === 'SR' && !newInventory.outfit_ids.includes('outfit_cyber_bunny')) {
        newInventory.outfit_ids = [...newInventory.outfit_ids, 'outfit_cyber_bunny'];
      }

      return {
        ...prev,
        cash: Math.max(0, prev.cash - 100),
        stats: {
          ...prev.stats,
          dgn: Math.min(10000, prev.stats.dgn + 50),
        },
        inventory: newInventory,
        pity: {
          ...prev.pity,
          banner_pulls: nextPity,
        },
      };
    });
  };

  const handleDrawTarot = (selectedIds: string[]) => {
    setState((prev) => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        active_tarot_buffs: selectedIds,
      },
    }));
  };

  const handleEquipOutfit = (outfitId: string) => {
    setState((prev) => ({
      ...prev,
      inventory: {
        ...prev.inventory,
        equipped_outfit_id: outfitId,
      },
    }));
  };

  const handleCasinoCashout = (potGain: number, degenGain: number) => {
    setState((prev) => ({
      ...prev,
      cash: prev.cash + potGain,
      stats: {
        ...prev.stats,
        dgn: Math.min(10000, prev.stats.dgn + degenGain),
      },
    }));
  };

  const handleCasinoBust = (energyPenalty: number) => {
    setState((prev) => ({
      ...prev,
      energy: Math.max(0, prev.energy - energyPenalty),
      stats: {
        ...prev.stats,
        dgn: Math.min(10000, prev.stats.dgn + 100),
      },
    }));
  };

  return (
    <div className="app-shell" data-testid="hrpg-root">
      {/* Header */}
      <header className="header" data-testid="hrpg-header">
        <div className="header-left">
          <h1>🕹️ StickHRPG: Degenerate Horizon</h1>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }} data-testid="hrpg-world-clock">
            Day {state.day} · {state.hour}:00
          </span>
        </div>

        <div className="header-right">
          <a
            className="btn btn--sm"
            href="/"
            style={{ textDecoration: 'none' }}
          >
            👨‍✈️ Cockpit
          </a>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              className={`btn btn--sm ${activeTab === 'dex' ? 'btn--primary' : ''}`}
              onClick={() => setActiveTab('dex')}
              data-testid="hrpg-nav-dex"
            >
              1. Dex
            </button>
            <button
              className={`btn btn--sm ${activeTab === 'arena' ? 'btn--primary' : ''}`}
              onClick={() => setActiveTab('arena')}
              data-testid="hrpg-nav-arena"
            >
              2. Arena
            </button>
            <button
              className={`btn btn--sm ${activeTab === 'oracle' ? 'btn--primary' : ''}`}
              onClick={() => setActiveTab('oracle')}
              data-testid="hrpg-nav-oracle"
            >
              3. Oracle
            </button>
            <button
              className={`btn btn--sm ${activeTab === 'forge' ? 'btn--primary' : ''}`}
              onClick={() => setActiveTab('forge')}
              data-testid="hrpg-nav-forge"
            >
              4. Forge
            </button>
          </div>

          <button
            className="btn btn--danger btn--sm"
            onClick={handleSleep}
            title="Sleep and Reset Energy (R)"
            data-testid="hrpg-btn-sleep"
          >
            💤 Sleep (R)
          </button>
        </div>
      </header>

      {/* Real-time HUD Stat Bar */}
      <StatBar state={state} />

      {/* Casino Mini Game */}
      <CasinoMiniGame
        state={state}
        onCashout={handleCasinoCashout}
        onBust={handleCasinoBust}
      />

      {/* Active View Router */}
      {activeTab === 'arena' && (
        <ArenaView state={state} jobs={JOBS_DATA} onClockIn={handleClockIn} />
      )}
      {activeTab === 'dex' && (
        <DexView
          state={state}
          outfits={OUTFITS_DATA}
          companions={COMPANIONS_DATA}
          onEquipOutfit={handleEquipOutfit}
        />
      )}
      {activeTab === 'oracle' && (
        <OracleView
          state={state}
          outfits={OUTFITS_DATA}
          tarotCards={TAROT_DATA}
          onPullGacha={handlePullGacha}
          onDrawTarot={handleDrawTarot}
        />
      )}
      {activeTab === 'forge' && (
        <ForgeView state={state} onTrain={handleTrain} />
      )}

      {/* Visual Novel Encounter Dialog Modal */}
      {activeEncounter && (
        <EncounterModal
          encounter={activeEncounter}
          state={state}
          onSelectChoice={handleSelectChoice}
          onClose={() => setActiveEncounter(null)}
        />
      )}

      {/* Footer */}
      <footer
        style={{
          marginTop: 'var(--space-2xl)',
          paddingTop: 'var(--space-lg)',
          borderTop: '1px solid var(--border-subtle)',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-mono)',
        }}
      >
        StickHRPG · GlitchWorks / zenOS · dex_id: 0x7D:0x20
      </footer>
    </div>
  );
}
