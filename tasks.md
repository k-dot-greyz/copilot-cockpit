# Copilot Cockpit — Tasks & Follow-Up Epics

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
- [ ] **MOD-KBD-GUARDS** — Text-input-only keyboard guard (checkbox unblock) `dex/cards/MOD-KBD-GUARDS.json`
- [ ] **MOD-PLAYWRIGHT-MIGRATE** — Move pure-fn Playwright specs to Vitest `dex/cards/MOD-PLAYWRIGHT-MIGRATE.json`
- [x] **MOD-JOINT-ENTITIES** — Shared entity contracts (`src/lib/entities/`) `dex/cards/MOD-JOINT-ENTITIES.json`

### Tier 1 — depends on Tier 0

- [ ] **MOD-PLAYWRIGHT-CONFIG** — Browser project config `dex/cards/MOD-PLAYWRIGHT-CONFIG.json`
- [x] **MOD-PIPE-HYDRATE** — API → PRCardEntity (`src/lib/pipes/hydrate-pr.ts`) `dex/cards/MOD-PIPE-HYDRATE.json`
- [x] **MOD-PIPE-SANITIZE** — Metadata sanitization (`src/lib/pipes/sanitize-metadata.ts`) `dex/cards/MOD-PIPE-SANITIZE.json`
- [ ] **MOD-OAUTH-RATE-RECOVERY** — OAuth rate-limit tracking and error toast `dex/cards/MOD-OAUTH-RATE-RECOVERY.json`

### Tier 2 — depends on Tier 1

- [ ] **MOD-PLAYWRIGHT-E2E** — Real browser E2E smoke `dex/cards/MOD-PLAYWRIGHT-E2E.json`
- [x] **MOD-PIPE-DEX** — Entity → DexAssetCard (`src/lib/pipes/to-dex-card.ts`) `dex/cards/MOD-PIPE-DEX.json`
- [ ] **MOD-DUPLICATES-UI** — Wire findDuplicates to dashboard `dex/cards/MOD-DUPLICATES-UI.json`

### Tier 3 — integration

- [ ] **MOD-PR-PARITY-SYNC** — Reconcile with GraphQL model `dex/cards/MOD-PR-PARITY-SYNC.json`

---

## Epic: COCKPIT-HARDENING-003 — Post-Extraction Hardening & UI Parity

**dex_id:** `0x7D:0x12` | **Spec:** `docs/epics/COCKPIT-HARDENING-003.md` | **Cards:** `dex/cards/`

Follow-up tracking after extraction of `StickHRPG` into standalone `stickhrpg-dev`.

- [x] `ISSUE-COCKPIT-001`: Wire `findDuplicates` to PRDashboard with interactive duplicate cluster alerts and selective multi-close.
- [x] `ISSUE-COCKPIT-002`: Refine `isTextInput` to allow shortcut keys (e.g., `R`) while checkboxes or radios are focused.
- [ ] `ISSUE-COCKPIT-003`: Extend truthy draft coercion tests (e.g. `draft: 1`) and multi-page pagination assertions in `happy-path.test.ts`.
- [ ] `ISSUE-COCKPIT-004`: Configure real browser Playwright E2E suite (`tests/e2e-dashboard.spec.ts`) with Chromium and webServer fixture.
- [x] `ISSUE-COCKPIT-005`: Complete full parity reconciliation between `PRCardEntity` and GraphQL rich fields.
- [ ] `ISSUE-COCKPIT-006`: Implement OAuth rate limit backoff and error recovery toast banner in `PRDashboard`.

---

## Epic: COCKPIT-UX-004 — Schema-hydrated polymorphic cockpit

**dex_id:** `0x7D:0x13` | **Spec:** `docs/epics/COCKPIT-UX-004.md` | **GitHub:** [#20](https://github.com/k-dot-greyz/copilot-cockpit/issues/20)

**User story:** As a maintainer drowning in bot floods, I open the cockpit, authenticate, scan JSON-defined kanban lanes, hit ⌘K to search/act, nuke a flood or close duplicate copies, inspect a PR, and refresh with `R` even when a checkbox is focused.

- [x] Config / lane / action / PR JSON Schema cards (`schemas/`, `content/cockpit/`)
- [x] Live path hydrates `PRCardEntity`; lanes assigned from matcher cards
- [x] Glitch Islands kit transplant (`dex/06-tools/glitch-islands/`)
- [x] Command palette + confirm modal + kanban + repo chip
- [x] `?demo=1` offline board from fixture cards (no PAT required)
- [ ] WASM hydrate (#26)
- [ ] Real Chromium E2E (#27)
- [ ] Rate-limit toast (#28)
