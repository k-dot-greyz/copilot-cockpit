# StickHRPG & Copilot Cockpit — Tasks & Implementation Checklist

## Epic: STICKHRPG-CORE-001 — MVP Deterministic Engine & Game Loop

**User story:** As a cultured consoomer, I want an addictive life-sim RPG combining classic Flash StickRPG wage-slaving, stat grinds, casino degeneracy, and gacha/otome outfit collection with deterministic math and a keyboard-first accessible UI.

### Acceptance Criteria
- [x] Product Vision Whitepaper & Mechanic Specs with embedded schemas (`docs/whitepaper_stick_rpg.md`, `docs/mechanics/*.md`)
- [x] Curated Reference Index (`docs/reflibs.md`) referencing official docs for Rust, Astro, React, JSON Schema, MIDI 2.0, WCAG 2.2 AAA
- [x] Canonical JSON Schema entity manifests (`schemas/*.schema.json`)
- [x] Seed fixture cards for Jobs, Outfits, Companions, Encounters, and Tarot decks (`content/cards/**/*.json`)
- [x] Rust 2021+ core deterministic library (`packages/stick-core/`)
- [x] TypeScript SysEx sparse delta streaming & hydration logic with Vitest coverage (`src/lib/game/`)
- [x] Accessible Four-View Matrix UI (`Dex`, `Arena`, `Oracle`, `Forge`) and Casino mini-game (`src/components/`, `src/pages/game.astro`)
- [x] Full Vitest test suite passing (55/55 tests)

---

## Epic: COCKPIT-TRIAGE-001 — PR Triage Happy Path (MVP)

**User story:** As a maintainer drowning in bot PR floods, I want a single-screen triage cockpit so I can nuke duplicates and focus on human-ready PRs in under two minutes.

### Acceptance criteria
- [x] Token auth with invalid-token recovery (re-prompt modal)
- [x] Auto-categorize into 6 lanes via `categorizePRs`
- [x] Flood detection at ≥10 `greyzxc/<prefix>-<hash>` branches
- [x] One-click flood nuke with confirm + progress
- [x] Bulk close selected with partial-failure reporting
- [x] Keyboard `R` refresh (skipped when focused in input or during close)
- [ ] Surface `findDuplicates` in UI (tested, not wired yet) → **MOD-DUPLICATES-UI**
- [ ] E2E smoke test against mocked GitHub API → **MOD-PLAYWRIGHT-E2E**

---

## Epic: COCKPIT-PIPELINE-002 — Post-#7 Hardening & Dex Hydration

**dex_id:** `0x7D:0x11` | **Spec:** `docs/epics/COCKPIT-PIPELINE-002.md` | **Cards:** `dex/cards/`

Follow-up to merged [#7](https://github.com/k-dot-greyz/copilot-cockpit/pull/7). Modules are idempotent, tiered by dependency, and communicate via joint entities + pipes.

### Tier 0 — parallel, no deps
- [ ] **MOD-TEST-NITPICK** — Fix #7 review nitpicks (draft coercion, pagination mock) `dex/cards/MOD-TEST-NITPICK.json`
- [ ] **MOD-KBD-GUARDS** — Text-input-only keyboard guard `dex/cards/MOD-KBD-GUARDS.json`
- [ ] **MOD-PLAYWRIGHT-MIGRATE** — Move pure-fn Playwright specs to Vitest `dex/cards/MOD-PLAYWRIGHT-MIGRATE.json`
- [x] **MOD-JOINT-ENTITIES** — Shared entity contracts (`src/lib/entities/`) `dex/cards/MOD-JOINT-ENTITIES.json`

### Tier 1 — depends on Tier 0
- [ ] **MOD-PLAYWRIGHT-CONFIG** — Browser project config `dex/cards/MOD-PLAYWRIGHT-CONFIG.json`
- [x] **MOD-PIPE-HYDRATE** — API → PRCardEntity (`src/lib/pipes/hydrate-pr.ts`) `dex/cards/MOD-PIPE-HYDRATE.json`
- [x] **MOD-PIPE-SANITIZE** — Metadata sanitization (`src/lib/pipes/sanitize-metadata.ts`) `dex/cards/MOD-PIPE-SANITIZE.json`

### Tier 2 — depends on Tier 1
- [ ] **MOD-PLAYWRIGHT-E2E** — Real browser E2E smoke `dex/cards/MOD-PLAYWRIGHT-E2E.json`
- [x] **MOD-PIPE-DEX** — Entity → DexAssetCard (`src/lib/pipes/to-dex-card.ts`) `dex/cards/MOD-PIPE-DEX.json`
- [ ] **MOD-DUPLICATES-UI** — Wire findDuplicates to dashboard `dex/cards/MOD-DUPLICATES-UI.json`

### Tier 3 — integration
- [ ] **MOD-PR-PARITY-SYNC** — Reconcile with GraphQL model `dex/cards/MOD-PR-PARITY-SYNC.json`

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
- [x] **TASK-VN-003**: Interactive visual novel dialogue engine with branching choice trees and affinity checks
- [x] Schema `schemas/encounter_card.schema.json` and narrative encounter fixtures
- [x] Reusable `EncounterModal.tsx` dialogue component wired to GameShell
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
