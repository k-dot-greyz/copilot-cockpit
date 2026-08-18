# StickHRPG: Degenerate Horizon — Tasks & Implementation Checklist

## Epic: STICKHRPG-CORE-001 — MVP Deterministic Engine & Game Loop

**User story:** As a cultured consoomer, I want an addictive life-sim RPG combining classic Flash StickRPG wage-slaving, stat grinds, casino degeneracy, and gacha/otome outfit collection with deterministic math and a keyboard-first accessible UI.

### Acceptance Criteria
- [x] Product Vision Whitepaper & Mechanic Specs with embedded schemas (`docs/whitepaper_stick_rpg.md`, `docs/mechanics/*.md`)
- [x] Curated Reference Index (`docs/reflibs.md`) referencing official docs for Rust, Astro, React, JSON Schema, MIDI 2.0, WCAG 2.2 AAA
- [x] Canonical JSON Schema entity manifests (`schemas/*.schema.json`)
- [x] Seed fixture cards for Jobs, Outfits, Companions, and Tarot decks (`content/cards/**/*.json`)
- [x] Rust 2021+ core deterministic library (`packages/stick-core/`)
- [x] TypeScript SysEx sparse delta streaming & hydration logic with Vitest coverage (`src/lib/game/`)
- [x] Accessible Four-View Matrix UI (`Dex`, `Arena`, `Oracle`, `Forge`) and Casino mini-game (`src/components/`, `src/pages/game.astro`)
- [x] Full Vitest test suite passing (55/55 tests)

---

## Epic: STICKHRPG-WASM-001 — WebAssembly Deterministic Engine Bridge
- [ ] **TASK-WASM-001**: Compile `stick-core` to WebAssembly via `wasm-bindgen` and integrate with Astro client island
- [ ] Fallback to pure TypeScript engine when WASM environment is unavailable
- [ ] Zero-allocation delta hydration benchmarked under 0.5ms

## Epic: STICKHRPG-SYNC-002 — MIDI 2.0 / SysEx Streaming & Multiplayer
- [ ] **TASK-SYSEX-002**: WebSocket live MIDI 2.0 / SysEx state sync channel and multiplayer ghost leaderboard
- [ ] Automatic reconnection, backoff, and packet sequence validation
- [ ] Real-time high-roller Degen leaderboard in Dex view

## Epic: STICKHRPG-OTOME-003 — Visual Novel Dialogue & Affinity Trees
- [ ] **TASK-VN-003**: Interactive visual novel dialogue engine with branching choice trees and affinity checks
- [ ] Schema `schemas/encounter_card.schema.json` and narrative encounter fixtures
- [ ] Dynamic companion romance milestones and passive perk unlocking

## Epic: STICKHRPG-COMBAT-004 — Underground Fight Pit & Turn-Based Combat
- [ ] **TASK-COMBAT-004**: Underground Fight Pit turn-based brawler mini-game with outfit/tarot elemental damage
- [ ] Elemental rock-paper-scissors matrix (`Fire > Aether > Water > Void > Fire`)
- [ ] Boss fights with unique relic card drops

## Epic: STICKHRPG-CASINO-005 — Speculative Markets & Crypto Liquidation
- [ ] **TASK-CASINO-005**: Crypto liquidation roulette & dynamic rugpull market simulator
- [ ] 10x to 100x leverage sliders with margin call liquidation triggers
- [ ] Existential Dread debuff mechanics and recovery activities in Forge view

## Epic: STICKHRPG-A11Y-006 — WCAG 2.2 AAA & Neurodivergent Accessibility Suite
- [ ] **TASK-A11Y-006**: WCAG 2.2 AAA accessibility control panel & neurodivergent sensory settings
- [ ] Reduced motion, screen-shake disable, high-contrast palette overrides
- [ ] Automated Playwright / axe-core verification with 0 violations
