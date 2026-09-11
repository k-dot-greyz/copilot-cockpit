# Epic: COCKPIT-UX-004 — Schema-hydrated polymorphic cockpit + UX redesign

**dex_id:** `0x7D:0x13`  
**parent:** `0x7D:0x10`  
**github:** [#20](https://github.com/k-dot-greyz/copilot-cockpit/issues/20)  
**status:** `active`

## Roast (locked)

Pipes were a sidecar. `PRDashboard.tsx` never called `hydratePRCard`. Lanes were six copy-pasted JSX blocks. Owner/repo and team logins were TypeScript constants. Playwright never opened Chromium. Python does not belong in this runtime. `client:only` wrapping the universe is not Glitch Islands.

## This slice

- JSON Schema cards for config / lanes / actions / PR entity
- Live categorization via `assignLanes` + lane JSON
- Glitch Islands kit transplanted from `dev-master`
- Kanban board, command palette, confirm modal, duplicate clusters
- `packages/cockpit-core` Rust 2021 (rustc 1.83 in this env; edition 2024 needs 1.85+)
- Keyboard: `R` works on checkboxes; `⌘K` palette; `j/k` `x` `i` `?`

## Follow-ups

- #26 WASM hydrate
- #27 real Chromium E2E
- #28 rate-limit toast
- rustc bump for edition 2024
