# Testing Methodology & Quality Gates (`TESTING.md`)

> **StickHRPG: Degenerate Horizon**
> TDD Verification, Deterministic Engine Testing & A11y Standards

---

## 1. Quality Gates & Testing Philosophy

1. **Deterministic Core Logic First**:
   - Every mathematical formula (XP progression, salary scaling, gacha pity curves, SysEx delta serialization) must be backed by deterministic unit tests with known random seeds.
2. **Accessible Interaction Verification**:
   - All interactive components must be operable via keyboard (`WASD`, `1-4`, `Space`, `Enter`, `R`) and announce state updates to screen readers via ARIA live regions.
3. **No Flaky E2E**:
   - Use fixed test IDs (`data-testid` from `TESTIDS.md`) and deterministic mock states rather than time-dependent polling.

---

## 2. Test Suites

### 2.1 Unit Tests (Vitest)
- `src/lib/game/__tests__/stats.test.ts`: XP curve calculation, level-up threshold checks, fatigue costs.
- `src/lib/game/__tests__/jobs.test.ts`: Shift wage formulas, stat gate validation, promotion requirements.
- `src/lib/game/__tests__/gacha.test.ts`: Soft/hard pity counter validation, 50/50 banner mechanics.
- `src/lib/game/__tests__/tarot.test.ts`: Daily 3-card spread generation, elemental resonance buff modifiers.
- `src/lib/game/__tests__/sysex-sync.test.ts`: SysEx handshake parsing, bitmask delta hydration, sparse diff updates.

### 2.2 Component & Integration Tests (React Testing Library)
- `src/components/__tests__/GameShell.test.tsx`: View routing (`1-4`), keyboard guard handling, stat HUD reactivity.
- `src/components/__tests__/CasinoMiniGame.test.tsx`: Bet placing, multiplier ladder edging ($2^n$), bust penalties.

### 2.3 E2E Tests (Playwright)
- `tests/gameplay-loop.spec.ts`: End-to-end happy path: New game -> Clock-in shift -> Spend cash on Gacha pull -> Equip outfit -> Check stat multiplier in Forge.

---

## 3. Running Test Commands

```bash
# Run all unit tests with Vitest
npm run test

# Run unit tests in watch mode
npm run test:watch

# Run Playwright E2E tests
npm run test:ux
```
