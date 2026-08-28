# Copilot Cockpit — Tasks

## Epic: COCKPIT-TRIAGE-001 — PR Triage Happy Path (MVP)

**User story:** As a maintainer drowning in bot PR floods, I want a single-screen triage cockpit so I can nuke duplicates and focus on human-ready PRs in under two minutes.

### Happy path UX flow

| Step | Actor action | System response |
|------|--------------|-----------------|
| 1 | Open dashboard (no stored token) | Token modal — PAT with `repo` scope, stored in `localStorage` only |
| 2 | Click **Connect** | `validateToken` → modal closes, `@username` in header |
| 3 | — (automatic) | Paginated fetch of open PRs from `k-dot-greyz/dev-master` with progress bar |
| 4 | Scan stat bar | Total · Ready · Drafts · Human · Bot · 🚨 Flood (if any) |
| 5a | **Flood path:** click **☢ Nuke N PRs** on flood alert | Confirm dialog → sequential close + branch delete → progress bar → flood section clears |
| 5b | **Human path:** review **🔥 Your PRs — Ready for Review** | PR cards with author badge, draft/ready, relative time, **View** link |
| 6 | Optional: checkbox-select PRs → **Close N selected** | Confirm → bulk close with progress; partial failures surface in error banner |
| 7 | Press **R** or click **↻ Refresh** | Re-fetch; empty repo shows **No open PRs found. 🎉** |

### Priority lane order (top → bottom)

1. 🔥 Human — Ready for Review *(action first)*
2. 📝 Human — Drafts
3. 🧪 Bot Test/Security Coverage
4. 🤖 Bot — Other
5. 🚨 Bot Flood (Duplicates)
6. 👥 External

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
