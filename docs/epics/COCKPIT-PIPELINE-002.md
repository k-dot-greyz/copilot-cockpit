# Epic: COCKPIT-PIPELINE-002 — Post-#7 Hardening & Dex Hydration Pipeline

**dex_id:** `0x7D:0x11`  
**parent:** `0x7D:0x10` (Copilot Cockpit)  
**status:** `planning`  
**tags:** `pipeline`, `hydration`, `dex`, `security`, `testing`, `idempotent`

## Context

Follow-up to merged [#7 — test(security): PR URL allowlist, keyboard guards, and UX coverage](https://github.com/k-dot-greyz/copilot-cockpit/pull/7).

Incorporates unresolved review nitpicks, coordinates with open stacked PRs, and scaffolds the joint-entity + pipe architecture for dex asset pipeline card creation.

### Related PRs

| PR | Branch | Status | Relationship |
|----|--------|--------|--------------|
| [#7](https://github.com/k-dot-greyz/copilot-cockpit/pull/7) | `greyzxc/dex-security-ux-coverage-89ff` | **Merged** | Base security + test coverage |
| [#10](https://github.com/k-dot-greyz/copilot-cockpit/pull/10) | `coderabbitai/autofix/6b87bf0` | Open | Cherry-pick keyboard-guards + playwright config fixes |
| [#8](https://github.com/k-dot-greyz/copilot-cockpit/pull/8) | `feat/pr-read-parity` | Open | GraphQL read parity — consumes joint entities on merge |
| [#11](https://github.com/k-dot-greyz/copilot-cockpit/pull/11) | `dependabot/...` | Open | Astro dep bump — independent |

## Architecture: Joint Entities + Pipes

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Hostile Input  │────▶│  Sanitize Pipe   │────▶│  Joint Entity   │
│  (API / URL /   │     │  pr-url, meta    │     │  PRCardEntity   │
│   AI payload)   │     └──────────────────┘     │  TriageViewEntity│
└─────────────────┘              │               │  DexAssetCard   │
                                 ▼               └────────┬────────┘
                        ┌──────────────────┐              │
                        │  Hydrate Pipe    │──────────────┘
                        │  API → entity    │
                        └──────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  Dex Card Pipe   │──▶ dex/cards/*.json
                        │  entity → card   │    (asset pipeline)
                        └──────────────────┘
```

**Principle:** Each module owns one pipe or one entity slice. Modules read/write joint entities only — never reach into another module's internals. Re-running a module is idempotent: same input entity → same output entity.

## Module Dependency Graph

Modules with **no upstream deps** can be developed in any order or in parallel:

```
Tier 0 (parallel, no deps):
  MOD-TEST-NITPICK
  MOD-KBD-GUARDS
  MOD-PLAYWRIGHT-MIGRATE
  MOD-JOINT-ENTITIES

Tier 1 (depends on Tier 0):
  MOD-PLAYWRIGHT-CONFIG    ← MOD-PLAYWRIGHT-MIGRATE
  MOD-PIPE-HYDRATE           ← MOD-JOINT-ENTITIES
  MOD-PIPE-SANITIZE          ← MOD-JOINT-ENTITIES

Tier 2 (depends on Tier 1):
  MOD-PLAYWRIGHT-E2E         ← MOD-PLAYWRIGHT-CONFIG
  MOD-PIPE-DEX               ← MOD-JOINT-ENTITIES, MOD-PIPE-HYDRATE
  MOD-DUPLICATES-UI          ← MOD-JOINT-ENTITIES (UI only)

Tier 3 (integration):
  MOD-PR-PARITY-SYNC         ← MOD-JOINT-ENTITIES, MOD-PIPE-HYDRATE, #8 merge
```

## Module Index

Dex cards live in `dex/cards/`. Each card is a self-contained work unit.

| Card ID | Title | Tier | Tags |
|---------|-------|------|------|
| `MOD-TEST-NITPICK` | Fix #7 review nitpicks | 0 | `test`, `vitest` |
| `MOD-KBD-GUARDS` | Text-input-only keyboard guard | 0 | `ux`, `security` |
| `MOD-PLAYWRIGHT-MIGRATE` | Migrate pure-fn tests to Vitest | 0 | `test`, `refactor` |
| `MOD-JOINT-ENTITIES` | Shared entity contracts | 0 | `architecture`, `types` |
| `MOD-PLAYWRIGHT-CONFIG` | Playwright browser project config | 1 | `test`, `e2e` |
| `MOD-PIPE-HYDRATE` | API → PRCardEntity hydration | 1 | `pipe`, `hydration` |
| `MOD-PIPE-SANITIZE` | Metadata sanitization pipe | 1 | `pipe`, `security` |
| `MOD-PLAYWRIGHT-E2E` | Real browser E2E smoke tests | 2 | `test`, `e2e` |
| `MOD-PIPE-DEX` | Entity → DexAssetCard transform | 2 | `pipe`, `dex` |
| `MOD-DUPLICATES-UI` | Wire findDuplicates to dashboard | 2 | `ui`, `triage` |
| `MOD-PR-PARITY-SYNC` | Reconcile with #8 GraphQL model | 3 | `integration`, `graphql` |

## Acceptance (epic-level)

- [ ] All Tier 0 modules complete and `npm run test` green
- [ ] Joint entities used by `github.ts` `mapPR` (or successor) and triage functions
- [ ] At least one dex card emitted per triage lane via `MOD-PIPE-DEX`
- [ ] Playwright runs only true browser E2E; pure logic in Vitest
- [ ] #10 fixes absorbed or superseded; #10 closed
- [ ] #8 merge plan documented in `MOD-PR-PARITY-SYNC` card
