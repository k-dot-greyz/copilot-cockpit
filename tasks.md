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

## Epic: STICKHRPG-EXPANSION-001 — Aspirational & Deep Systems (Roadmap)

- [ ] WebAssembly compilation of `stick-core` directly into Astro client island
- [ ] WebSocket backend streaming live MIDI 2.0 SysEx packets between players
- [ ] Visual novel full voice-acted dialogue choice branches for all Harem/Otome companions
- [ ] Underground Fight Pit street combat mini-game with real-time frame data
- [ ] Dark-alley crypto margin liquidation spinner with dynamic rugpull events
