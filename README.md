# StickHRPG: Degenerate Horizon (Cultured Consoomer Edition) 🕹️

> A satirical, hyper-addictive life-sim RPG marrying classic Flash **StickRPG** (top-down city grinds, day/night clock cycles, dead-end corporate wage-slaving, casino degeneracy, street fights) with modern **gacha / otome / harem outfit collection**, **cyber-mystic tarot divination**, and **SysEx-inspired delta streaming**.

Part of **GlitchWorks / zenOS / dev-master** (`dex_id: 0x7D:0x20`).

---

## 🚀 Quick Launch

```bash
npm install
npm run dev        # Launch local Astro dev server
```
Navigate to `http://localhost:4321/game` to play the interactive MVP view!

To execute deterministic tests:
```bash
npm run test       # Run Vitest test suite
```

---

## 📚 Documentation Map & Reference Index

| Document | Purpose |
|---|---|
| [`docs/reflibs.md`](docs/reflibs.md) | **Curated Index of Official Documentation URLs & Tech Stack Standards** |
| [`docs/whitepaper_stick_rpg.md`](docs/whitepaper_stick_rpg.md) | **Full Product Vision & Game Mechanics Design Whitepaper** |
| [`docs/SPEC.md`](docs/SPEC.md) | **Four-View Matrix (Dex/Arena/Oracle/Forge) Spec & Data Contracts** |
| [`docs/TESTING.md`](docs/TESTING.md) | **Testing Methodology, Coverage & Quality Gates** |
| [`docs/TESTIDS.md`](docs/TESTIDS.md) | **Canonical data-testid Registry for Accessible E2E & RTL Testing** |
| [`docs/mechanics/`](docs/mechanics/) | **Per-Mechanic Planning Specs with Embedded JSON Manifest Schemas** |

---

## 🏗️ Technical Stack Harness

- **Frontend Core**: [Astro 6+](https://docs.astro.build/) + [React 19](https://react.dev/) client islands.
- **Backend Game Engine**: Rust 2021+ deterministic engine (`packages/stick-core/`).
- **Data Entities**: Declarative JSON cards validated against [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12/release-notes).
- **Streaming Protocol**: [MIDI 2.0 & SysEx-Inspired](https://www.midi.org/specifications/midi-2-0-specifications) sparse delta state synchronization.
- **Accessibility**: High-contrast, neurodivergent-friendly, fully keyboard-navigable (`WASD`, `1-4`, `R`, `Space`), and [WCAG 2.2 AAA](https://www.w3.org/TR/WCAG22/) compliant.
- **Verification**: [Vitest](https://vitest.dev/) unit/integration tests and [Playwright](https://playwright.dev/) E2E browser tests.

---

## 🕹️ The Four-View Matrix (Keyboard Shortcuts)

| Key | View | Action |
|:---:|:---|:---|
| `1` | **Dex** | Wardrobe & Companion Archive (Equip outfits, inspect waifu synergies) |
| `2` | **Arena** | Career shifts, fight clubs, and wage-slave hustles |
| `3` | **Oracle** | Gacha loot crate 10-pulls, pity counters & daily 3-card Tarot divination |
| `4` | **Forge** | Gym stat grinds, prompt engineering bootcamps, and styling bars |
| `R` | **Sleep** | Advance day clock, restore 100 Energy, pay daily rent, draw new Tarot spread |
