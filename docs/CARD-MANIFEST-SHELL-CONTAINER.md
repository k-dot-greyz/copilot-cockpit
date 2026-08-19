---
dex_id: "0x7D:0x21:CONTAINER-MASTER"
title: "StickHRPG & Atelier Git Issue & Manifest Shell Container"
description: "Master markdown container encapsulating all hydrated JSON card git issue manifests, MVP user journey test plans, and schema examples."
status: "active"
tags: ["container", "manifest", "git-issues", "epics", "stickhrpg", "atelier", "playwright"]
---

# 📦 StickHRPG & Atelier Git Issue Manifest Shell Container

This document serves as the canonical shell container for all hydrated JSON card manifests, work items, and Playwright MVP UX test definitions.

---

## 1. Hydrated Task Manifest Index (`docs/tasks-backlog.json`)

```json
[
  {
    "id": "TASK-WASM-001",
    "epic": "STICKHRPG-WASM-001",
    "title": "Compile stick-core to WebAssembly via wasm-bindgen and integrate with Astro client island",
    "status": "pending",
    "priority": "P1",
    "description": "Build wasm-pack bindings for packages/stick-core exposing deterministic stat XP math, job promotion validation, gacha pity RNG, and SysEx delta packing directly in browser runtime.",
    "acceptance_criteria": [
      "wasm-pack build output configured under packages/stick-core/pkg",
      "TypeScript wrapper with fallback to pure TS implementation if WebAssembly is unavailable",
      "Benchmarked zero-allocation delta hydration under 0.5ms per tick"
    ],
    "target_files": [
      "packages/stick-core/Cargo.toml",
      "packages/stick-core/src/lib.rs",
      "src/lib/game/wasm-loader.ts"
    ]
  },
  {
    "id": "TASK-SYSEX-002",
    "epic": "STICKHRPG-SYNC-002",
    "title": "WebSocket live MIDI 2.0 / SysEx state sync channel and multiplayer ghost leaderboard",
    "status": "pending",
    "priority": "P2",
    "description": "Implement bidirectional WebSocket channel streaming 0xF0 (full handshake) and 0xF7 (bitmask sparse diff) packets to synchronize player ghost actions and high-score leaderboards.",
    "acceptance_criteria": [
      "WebSocket client handler with automatic reconnection and exponential backoff",
      "SysEx bitmask unpacker handling packet sequences without dropped state ticks",
      "Leaderboard component in Dex view showing high-roller Degen scores"
    ],
    "target_files": [
      "src/lib/game/sysex-socket.ts",
      "src/components/views/DexView.tsx",
      "schemas/sysex_delta_packet.schema.json"
    ]
  },
  {
    "id": "TASK-VN-003",
    "epic": "STICKHRPG-OTOME-003",
    "title": "Interactive visual novel dialogue engine with branching choice trees and affinity checks",
    "status": "completed",
    "priority": "P1",
    "description": "Create reusable EncounterModal component parsing JSON narrative cards with branching choices conditioned on Charm, Degen, and Karma stats.",
    "acceptance_criteria": [
      "Encounter card JSON schema and narrative encounter fixtures",
      "Choice selection checks against player CHM/KRM/DGN stats",
      "Affinity XP reward triggers and companion perk unlock animations"
    ],
    "target_files": [
      "schemas/encounter_card.schema.json",
      "content/cards/encounters/back_alley_deal.json",
      "content/cards/encounters/awkward_watercooler.json",
      "src/components/EncounterModal.tsx"
    ]
  },
  {
    "id": "TASK-COMBAT-004",
    "epic": "STICKHRPG-COMBAT-004",
    "title": "Underground Fight Pit turn-based brawler mini-game with outfit/tarot elemental damage",
    "status": "pending",
    "priority": "P2",
    "description": "Implement turn-based combat arena in Arena view utilizing player STR, equipped outfit element multipliers (Void, Fire, Water, Aether), and Tarot card ATK/DEF/SPD attributes.",
    "acceptance_criteria": [
      "Turn-based combat state machine with Attack, Defend, Degen Gambits, and Item actions",
      "Elemental rock-paper-scissors effectiveness matrix (Fire > Aether > Water > Void > Fire)",
      "Loot drops (Cash, Relic Cards, Degen Score) upon defeating underground champions"
    ],
    "target_files": [
      "src/lib/game/combat-engine.ts",
      "src/components/views/ArenaView.tsx",
      "src/lib/game/__tests__/combat.test.ts"
    ]
  },
  {
    "id": "TASK-CASINO-005",
    "epic": "STICKHRPG-CASINO-005",
    "title": "Crypto liquidation roulette & dynamic rugpull market simulator",
    "status": "pending",
    "priority": "P2",
    "description": "Expand Casino Mini-Game into a speculative market terminal with high-leverage 100x margin trading, liquidation warnings, and meme coin rugpull mechanics.",
    "acceptance_criteria": [
      "Dynamic price ticker with Poisson rugpull probability based on Degen score",
      "10x to 100x leverage sliders with margin call liquidation triggers",
      "Existential Dread recovery activities in Forge view"
    ],
    "target_files": [
      "src/components/CasinoMiniGame.tsx",
      "src/lib/game/market-engine.ts",
      "docs/mechanics/04_consoomer_casino.md"
    ]
  },
  {
    "id": "TASK-A11Y-006",
    "epic": "STICKHRPG-A11Y-006",
    "title": "WCAG 2.2 AAA accessibility control panel & neurodivergent sensory settings",
    "status": "pending",
    "priority": "P1",
    "description": "Build A11ySettingsModal with configurable reduced motion, screen-shake toggle, flashing light suppression, high-contrast theme overrides, and text-to-speech ARIA live region pacing.",
    "acceptance_criteria": [
      "Accessible modal navigable completely via keyboard (Esc to close, Tab traps)",
      "Persistent user preferences in localStorage",
      "Passes automated axe-core / Playwright accessibility checks with 0 violations"
    ],
    "target_files": [
      "src/components/A11ySettingsModal.tsx",
      "src/styles/global.css",
      "tests/a11y-wcag.spec.ts"
    ]
  }
]
```

---

## 2. Playwright MVP Happy Path Test (`tests/stickhrpg-happy-path.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';
import { INITIAL_PLAYER_STATE } from '../src/lib/game/types';
import { calculateShiftPayout, addStatXP, rollGacha } from '../src/lib/game/engine';

test.describe('StickHRPG: MVP Core Happy Path User Journey', () => {
  test('Full core loop: state init -> wage slave shift -> gacha pull -> outfit equip -> stats training', () => {
    let player = { ...INITIAL_PLAYER_STATE };
    expect(player.cash).toBe(250);
    expect(player.energy).toBe(100);

    // 1. Clock in to wage-slave shift (Fast Food)
    const fastFoodJob = {
      id: 'job_fast_food_flipper',
      title: 'Fast Food Patty Flipper',
      track: 'fast_food' as const,
      tier: 1,
      base_payout: 45,
      energy_cost: 25,
      hours: 4,
      description: 'Flipping synthetic patties',
      requirements: { str: 1, int: 1, chm: 1, krm: 0 },
    };

    const payout = calculateShiftPayout(fastFoodJob, player.stats);
    player.cash += payout;
    player.energy -= fastFoodJob.energy_cost;
    player.hour = (player.hour + fastFoodJob.hours) % 24;
    const { stats: updatedStr } = addStatXP(player.stats, 'str', 25);
    player.stats = updatedStr;

    expect(player.cash).toBe(250 + 45);
    expect(player.energy).toBe(75);
    expect(player.stats.str_xp).toBe(25);

    // 2. Oracle View: Gacha Pull
    expect(player.cash).toBeGreaterThanOrEqual(100);
    const pull = rollGacha(player.pity.banner_pulls, 0.005); // Force SSR roll
    expect(pull.rarity).toBe('SSR');
    player.cash -= 100;
    player.inventory.outfit_ids.push('outfit_maid_tuxedo');
    player.pity.banner_pulls = pull.nextPityPulls;

    expect(player.inventory.outfit_ids).toContain('outfit_maid_tuxedo');
    expect(player.pity.banner_pulls).toBe(0);

    // 3. Dex View: Equip Outfit
    player.inventory.equipped_outfit_id = 'outfit_maid_tuxedo';
    expect(player.inventory.equipped_outfit_id).toBe('outfit_maid_tuxedo');

    // 4. Forge View: Lift Weights
    const { stats: gymStats } = addStatXP(player.stats, 'str', 75);
    player.stats = gymStats;
    player.energy -= 20;

    expect(player.stats.str_xp).toBe(100);
    expect(player.energy).toBe(55);

    // 5. Sleep (R): Advance day, restore energy, deduct rent
    player.day += 1;
    player.hour = 8;
    player.energy = 100;
    player.cash = Math.max(0, player.cash - 25);

    expect(player.day).toBe(2);
    expect(player.energy).toBe(100);
    expect(player.cash).toBe(170);
  });
});
```
