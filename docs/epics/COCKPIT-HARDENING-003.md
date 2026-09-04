# Epic: COCKPIT-HARDENING-003 — Post-Extraction Hardening & UI Parity

**dex_id:** `0x7D:0x12`  
**parent:** `0x7D:0x10` (Copilot Cockpit)  
**status:** `active`  
**tags:** `hardening`, `triage`, `duplicates`, `e2e`, `playwright`, `graphql`, `oauth`

---

## 1. Executive Summary & Context

Following the clean extraction of the `StickHRPG` game engine into `stickhrpg-dev`, **`copilot-cockpit`** focuses on its core mandate: **the ultra-fast developer cockpit for GitHub PR triage, bot flood mitigation, and CI/review inspection.**

This epic tracks all outstanding post-extraction hardening items, UX enhancements, and end-to-end testing milestones.

---

## 2. Tracked Work Items & Issue Manifests

| Issue ID | Dex Card | Tier | Title | Priority | Target Files |
|---|---|:---:|---|:---:|---|
| `ISSUE-COCKPIT-001` | `MOD-DUPLICATES-UI` | Tier 2 | Wire `findDuplicates` to Dashboard UI | **P1** | `src/components/PRDashboard.tsx`, `src/lib/triage.ts` |
| `ISSUE-COCKPIT-002` | `MOD-KBD-GUARDS` | Tier 0 | Text-input-only keyboard guard (checkbox unblock) | **P1** | `src/lib/keyboard-guards.ts`, `src/lib/keyboard-guards.test.ts` |
| `ISSUE-COCKPIT-003` | `MOD-TEST-NITPICK` | Tier 0 | Truthy draft coercion & multi-page pagination tests | **P2** | `src/lib/github.test.ts`, `src/lib/happy-path.test.ts` |
| `ISSUE-COCKPIT-004` | `MOD-PLAYWRIGHT-E2E` | Tier 2 | Real browser Playwright E2E smoke suite | **P1** | `playwright.config.ts`, `tests/e2e-dashboard.spec.ts` |
| `ISSUE-COCKPIT-005` | `MOD-PR-PARITY-SYNC` | Tier 3 | GraphQL read parity reconciliation with `PRCardEntity` | **P2** | `src/lib/entities/pr-card.ts`, `src/lib/pipes/hydrate-pr.ts` |
| `ISSUE-COCKPIT-006` | `MOD-OAUTH-RATE-RECOVERY` | Tier 1 | OAuth rate-limit backoff & toast error banner | **P2** | `src/components/PRDashboard.tsx`, `src/lib/github.ts` |

---

## 3. Detailed Acceptance Criteria

### `ISSUE-COCKPIT-001` (Task: `MOD-DUPLICATES-UI`)
- Render a dedicated `DuplicateAlert` card above the lane groups when `findDuplicates(prs)` detects 2+ PRs with identical titles.
- Display duplicate cluster count, oldest/newest timestamps, and a button to select all duplicate copies for bulk-close.
- Ensure keyboard guards and bulk-close dialogs function seamlessly with duplicate selections.

### `ISSUE-COCKPIT-002` (Task: `MOD-KBD-GUARDS`)
- Refine `isTextInput` in `src/lib/keyboard-guards.ts` to inspect `el.type` on `<input>` elements.
- Ensure `checkbox`, `radio`, `button`, and `submit` types do not block `R` / `r` refresh shortcuts.
- Add test coverage in `src/lib/keyboard-guards.test.ts`.

### `ISSUE-COCKPIT-003` (Task: `MOD-TEST-NITPICK`)
- In `src/lib/github.test.ts`: Test draft coercion with non-boolean truthy values (e.g. `draft: 1`).
- In `src/lib/happy-path.test.ts`: Verify multi-page pagination by mocking two distinct fetch pages.

### `ISSUE-COCKPIT-004` (Task: `MOD-PLAYWRIGHT-E2E` & `MOD-PLAYWRIGHT-CONFIG`)
- Update `playwright.config.ts` with standard Chromium project and webServer configuration for `npm run preview`.
- Add `tests/e2e-dashboard.spec.ts` testing actual DOM rendering, token modal connection, and stat bar updates.

### `ISSUE-COCKPIT-005` (Task: `MOD-PR-PARITY-SYNC`)
- Extend `PRCardEntity` with optional fields (`checksStatus`, `mergeable`, `state`, `commentsCount`, `additions`, `deletions`).
- Ensure both REST `hydratePRCard` and GraphQL `validateAndMapGraphQLPR` produce compatible entity shapes.

### `ISSUE-COCKPIT-006` (Task: `MOD-OAUTH-RATE-RECOVERY`)
- Surface GitHub API rate-limit headers (`X-RateLimit-Remaining`, `X-RateLimit-Reset`) in the dashboard footer.
- Render dismissible error toast when rate limits are approached.
