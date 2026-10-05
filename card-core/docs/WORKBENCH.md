# Card Workbench: vision, architecture and acceptance stories

Status: **proposal, for review. No code exists for anything in this document.** It is written to be argued with. Every claim marked *measured* comes from the engine spike in section 9; everything else is a decision or an assumption.

## 1. What it is, and for whom

A read-only web workbench for Card Core data. You open a pack, a folder or a single card and it answers three questions without trusting the UI to know any rule:

| Job | Question | Surface |
| --- | --- | --- |
| Inspect and trust | Is this card valid, current and allowed to be seen? | Inspector |
| Explain | Why is this value what it is? Which card did it come from, which default filled it? | Resolve view |
| Triage | Which of these domain cards needs a human, and which is hostile or incomplete? | Inbox (first domain surface: `demand.opportunity`) |

A fourth surface, the Asset ledger, shows licence, human-contribution and AI-disclosure facts and why an asset is held in `draft`.

Non-goals for v0: editing, committing, authentication, multi-user, domain kinds beyond the exemplars, and any game skin (parked).

## 2. Principles

They are the Card Core principles with a UI consequence each.

| Principle | UI consequence |
| --- | --- |
| The engine is authoritative | The UI never validates. It renders `{ok, errors: [{code, pointer}]}` and nothing else. |
| Fail closed, no silent defaults | An unknown kind, a failed lint or a missing registry shows a typed error panel. There is no "best effort" render of a card the engine rejected. |
| Unknown stays unknown | A missing fact renders as `—` with an "unknown" chip. Never `0`, never blank, never "N/A". |
| Deterministic, dates injected | The engine never reads a clock. The UI creates `as_of` in exactly one place and passes it in. |
| Hostile input | Every card string is data. Rendered as escaped text only. Quarantined text is collapsed and inert. |
| No hardcoding | Owners, repos, lane definitions, message text per error code, ranking and budgets are values in cards or config, not literals in components. |
| Implementation-agnostic | The UI talks to an `IEngine` port. Which engine sits behind it is configuration. |

## 3. Architecture

```
 UI islands (React in Astro)            pure TypeScript view-models
 ┌───────────────────────────┐          ┌───────────────────────────────┐
 │ Inspector · Resolve ·     │ ───────► │ pointer → node mapping        │
 │ Assets · Inbox · Palette  │          │ error grouping, lineage model │
 └─────────────┬─────────────┘          │ kind renderer registry        │
               │                        └───────────────┬───────────────┘
               │ ports                                  │
   ┌───────────▼───────────┐   ┌────────────────────────▼──────────┐
   │ ICardSource           │   │ IEngine  (protocol v1)            │
   │  FixturePack  (demo)  │   │  WasmEngine   (browser, worker)   │
   │  FileHandle   (local) │   │  ProtocolCli  (tests, CI)         │
   │  GitHubContents (ro)  │   │  RemoteEngine (optional, later)   │
   └───────────────────────┘   └───────────────────────────────────┘
```

### 3.1 The engine port

`IEngine` is the stdin/stdout protocol of SPEC section 11 as an async function: `run(request) -> response`. Two implementations exist for the same suite already (Python reference, Rust). The browser engine is the Rust crate compiled to WebAssembly, run in a Web Worker, and it is accepted only by passing the same conformance rows through the same harness. A JS validator would be a third implementation and would have to pass the suite too. It is the fallback, not the plan.

### 3.2 The UI must hand the engine raw text

*Measured.* A host that parses a card with `JSON.parse` and re-serialises it loses information the engine is built to catch: `2.0` becomes `2` (no `E_FLOAT`), integers above 2^53 are rounded (no `E_INT_RANGE`), duplicate keys collapse (no `E_DUP_KEY`), and lone surrogates are mangled. So:

- `ICardSource` yields **bytes or text**, never parsed objects.
- The request splices the card text into the request without a parse and re-stringify.
- The UI parses a card for display only **after** lint has passed, when the document is in the subset where JS parsing is lossless.

### 3.3 What the engine needs for a browser (all additive, all test-first)

| Need | Why | Spec and suite impact |
| --- | --- | --- |
| Registries from memory | No filesystem in a browser | None to the suite. `Engine::from_documents`, with `load` built on top of it. |
| `lint` over inline bytes | A dropped file has no path | New input form for `lint`; rows run both forms. |
| Pack files supplied inline | No directory to read | New request field `files`; the pack rows run both forms. |
| Path resolution that works without `realpath` | WASI and browsers have none | The path grammar already rejects every escaping path; add a row for a path naming a directory (exists). |
| A C-ABI or bindgen entry module | Browser calling convention | Not part of the spec. Lives in the crate behind `cfg(target_arch = "wasm32")`. |

### 3.4 State, data flow, performance

- The URL is the state: pack, card id, view, filters. No global store in v0.
- The engine runs in a Web Worker. *Measured:* ordinary cards take about 0.1 ms, but a 20,000-object structured document takes about 100 ms, so anything that can be large must stay off the main thread.
- Every response is rendered from the engine's own output. Error lists arrive already sorted and de-duplicated.
- A footer always shows the engine in use: implementation, the suite version it passes and the SHA-256 of the wasm file. An implementation states the suite version it passes (SPEC section 13); the UI makes that visible.

## 4. UX

### 4.1 Inspector (any kind)

```
┌ packs ────────┬ card ────────────────────────────────┬ resolve ──────────────┐
│ ▸ pack.demo   │ core.policy · pol.example-store      │ lineage               │
│   pol.…    ●  │ ● active   ▣ internal   rev 3        │  defaults.base        │
│   defaults… ● │ review_by ▓▓▓▓▓░░░ 41 days left      │   └ pol.example-store │
│   asset.…  ◐  │ ─ params ─────────────────────────   │ defaults.used         │
│               │  rules[0].value   12  ✖ E_SCHEMA     │  publish.daily = 12   │
│  ● valid      │  (marked from pointer /params/rules/0/value)                 │
│  ◐ draft      │                                      │ [validate] [resolve]  │
│  ✖ invalid    │                                      │ engine: rust-wasm ✓   │
└───────────────┴──────────────────────────────────────┴───────────────────────┘
```

- Left: a pack or folder as a tree. Status uses a shape and a label as well as colour.
- Centre: the card as a tree (generated from the kind's schema) with the raw text one keypress away. Errors are anchored to nodes by pointer. A pointer to a missing key marks its parent object, which is what the engine returns for `required`.
- Right: lineage root first, `defaults.used`, freshness, and the engine identity.
- A kind with no registered renderer gets the generic tree. A kind the registry does not know gets an `E_KIND_UNKNOWN` panel, not a guess.

### 4.2 Resolve view

Answers "why is this value what it is": the `extends` chain, the visibility ratchet (a child more public than a parent shows `E_VISIBILITY_WIDEN` on the child), and the defaults substituted. Per-leaf origin ("this key came from that card") is **not in the engine output today**; see decision D5.

### 4.3 Asset ledger

Artifact digest, placeholder vs real, licence ledger rows, human-contribution evidence, AI disclosure. When an asset is held in `draft`, the UI names which of the three schema rules applies (unknown licence, unknown AI use, AI use without human contribution), taken from the engine's `E_SCHEMA` pointers and not re-derived.

### 4.4 Opportunity inbox

```
 j/k move · p pursue · c clarify · x pass · / palette · ? help
 ┌ Acme data pipeline        budget  —unknown—     clarity ▓▓▓▓▓▓░░  EV uncalibrated
 │ source rss · posted 2026-09-30 · effort 40–80 h (unconfirmed)
 ├ Acme injection sample     ⛔ QUARANTINED · instruction_like
 │ ▸ text hidden (inert data) — press space to reveal as plain text
```

- Unknown fields render `—` plus a chip. A stated budget of 0 renders `0`.
- Ranking basis and the "uncalibrated" badge come from the card. Sort order is read from a ranking card, not coded in the component.
- v0 triage marks (pursue, clarify, pass) are **local view state** in the URL or local storage and are never written to a card. They are labelled that way on screen.

### 4.5 Palette and keyboard

`⌘K` or `/` opens the palette. Commands are cards (the open cockpit redesign PR in this repository already does this for its actions). `j/k` move, `space` expands, `?` shows the map. Shortcuts are suppressed while a text input has focus and never fire a destructive action.

### 4.6 States, copy, accessibility, look

- **States:** empty pack, loading engine, engine failed to load, lint failure (bytes), schema failure (pointer-anchored), stale card, quarantined card. Each has a designed state.
- **Copy:** one human sentence per error code, stored as data keyed by code. The code and pointer are always visible too.
- **Accessibility:** status never by colour alone; full keyboard operation; visible focus; reduced-motion respected; target WCAG 2.2 AA.
- **Look:** dense and dark, hardware-sequencer feel: monospace labels, LED-style status, per-lane accents. Motion is limited to state changes.

## 5. Security and hostile input

- No `innerHTML`, no markdown or HTML rendering of card text, no auto-linking.
- Strict CSP. The demo mode makes **zero** network requests (asserted by a test).
- v0 reads only public data. No tokens are stored.
- The wasm file is built in CI from the same commit as the suite it passed, and its digest is shown in the footer.

## 6. Where it lives

Recommended: `card-core/web/`, self-contained, with its own package and CI, built to leave like the rest of `card-core`. The cockpit app's `CONTRIBUTING.md` scopes that repository to Copilot-surface UI, so a card workbench there is arguably out of scope. See D1.

## 7. Acceptance stories

Written before code. Each one names its test layer. Rows marked *suite-derived* generate their cases from `conformance/` so the UI cannot drift from the engine.

| ID | Story | Layer |
| --- | --- | --- |
| WB-ENG-01 | The wasm engine passes every conformance row through the harness | harness (`--impl-cmd`) |
| WB-ENG-02 | The wasm module's imports are a fixed, reviewed list (no network, no filesystem) | unit |
| WB-ENG-03 | The footer shows implementation, suite version and wasm digest | e2e |
| WB-RAW-01 | A card with `2.0`, `9007199254740993`, a duplicate key or a lone surrogate produces the engine's error, not a silent accept | e2e, *suite-derived* |
| WB-INS-01 | For every suite row with an expected pointer, the Inspector marks the node at that pointer (or its parent for a missing key) | e2e, *suite-derived* |
| WB-INS-02 | A kind without a renderer shows the generic tree; an unregistered kind shows `E_KIND_UNKNOWN` | component |
| WB-INS-03 | Unknown values render `—` plus a chip; a stated 0 renders `0` | component |
| WB-INS-04 | Hostile strings (markup, script text, instruction-like text) render as inert text | e2e |
| WB-RES-01 | The lineage panel equals the engine's `lineage`, root first | component |
| WB-RES-02 | `defaults.used` lists exactly the keys the engine substituted | component |
| WB-RES-03 | A visibility widening and an id mismatch are shown on the offending card | e2e, *suite-derived* |
| WB-FRS-01 | `review_by` is inclusive: fresh on the day, stale the day after, for the injected `as_of` | unit, *suite-derived* |
| WB-FRS-02 | The clock is read in one place; with a frozen clock the UI output is identical across runs | unit |
| WB-AST-01 | A draft-forced asset names the schema rule that forces it | component, *suite-derived* |
| WB-AST-02 | Placeholder and real artifacts render distinctly; an unknown licence is never shown as open | component |
| WB-INB-01 | Pursue, clarify and pass change view state only; no write request is issued | e2e |
| WB-INB-02 | A quarantined card's text is collapsed and inert until revealed, and revealed as plain text | e2e |
| WB-INB-03 | Sort order and the "uncalibrated" badge come from card data | component |
| WB-OFF-01 | Demo mode works offline and makes zero network requests | e2e |
| WB-A11Y-01 | Status is conveyed without colour; every action works by keyboard; axe reports no serious issue | e2e |
| WB-PERF-01 | Budgets hold: initial transfer, engine init, typical validate, and no main-thread task over 50 ms for a 1 MiB document | e2e (budget values live in a config card) |
| WB-RO-01 | v0 is read-only: no request mutates anything | e2e |

## 8. Milestones

Each milestone starts with its failing tests.

| M | Scope | Exit |
| --- | --- | --- |
| M0 | This document, reviewed | decisions D1 to D5 answered |
| M1 | Engine for hosts without a filesystem: `from_documents`, inline `lint` bytes, inline pack `files`, rows for each, wasm build in CI | WB-ENG-01, WB-ENG-02, WB-RAW-01 (engine side) |
| M2 | Inspector, read-only, over fixture packs | WB-INS-*, WB-OFF-01, WB-A11Y-01 |
| M3 | Resolve view and freshness | WB-RES-*, WB-FRS-* |
| M4 | Asset ledger | WB-AST-* |
| M5 | Opportunity inbox | WB-INB-* |
| M6 | Migrate the cockpit's lane, action and config cards to Card Core kinds, using `adapt` on the existing JSON as fixtures | existing cockpit tests still green |

## 9. Engine spike: what was tried and what it showed

Question: can the Rust engine run in a browser, and what would it cost? Method: build the existing crate for two WebAssembly targets in a scratch copy, run the full conformance suite through each, and time it. The spike code is **not** committed.

**Results (all *measured*, one machine, Node 26 with V8, no real browser):**

| Build | Result |
| --- | --- |
| `wasm32-wasip1` under Node WASI, registries read from a preopened directory | 418 of 427 rows. The 9 failures were all pack rows: the engine's path resolution (`fs::canonicalize`) failed under WASI and the file was treated as missing. With a plain existence-check fallback, **427 of 427**; the exact error kind was not isolated. |
| `wasm32-unknown-unknown`, registries embedded in the binary, no WASI, wasm-bindgen glue (`--target web`) | 378 of 427 rows with the protocol as it is. All 49 failures were the rows that read files by path: 40 `lint` rows and 9 pack rows. |
| Same, with `lint` bytes and pack files supplied inline by the host | 426 of 427. The one failure is the host losing a float through `JSON.parse` (section 3.2), not the engine: the same row passes in the WASI run, which hands the engine raw bytes. |

**Size.** Default release build: 4.62 MB raw, 1.19 MB gzip, 756 KB brotli. With `opt-level=z` and stripped symbols: 2.41 MB raw, 726 KB gzip, 509 KB brotli (this build was not re-run through the suite or timed). Both include the embedded conformance-only schemas.

**Speed (warm, in-process, per call):**

| Input | Time |
| --- | --- |
| Compile the module | 16 ms |
| Instantiate and build the engine from embedded registries | 71 ms |
| `validate`, typical policy card (1 KB) | 0.095 ms |
| `resolve` with defaults, 3 cards | 0.12 ms |
| `adapt`, 900 KB single-string payload | 6.9 ms |
| `adapt`, 478 KB with 20,000 small objects | 100 ms |

**What this does not show.** It was not run in a real browser or a Web Worker. Memory behaviour over many calls was not measured. The `opt-level=z` build's speed and conformance are untested, and `wasm-opt` was not available. Mobile load time against a low-end-phone budget (the cockpit redesign PR names one) is not measured. Browser support for the wasm features used (reference types) was not checked.

**To reproduce.** `rustup target add wasm32-wasip1 wasm32-unknown-unknown`; build the crate with `--target ...`; for the browser build install `wasm-bindgen-cli` at the version in `Cargo.lock` and run it with `--target web`; drive the exports from Node and point `run_conformance.py --impl-cmd` at a host that does the file reading. M1 turns this into committed code with tests.

## 10. Decisions to make

| ID | Question | Recommendation |
| --- | --- | --- |
| D1 | Where does it live? | `card-core/web/`, self-contained |
| D2 | Which engine in the browser? | Rust to WASM, proven by the suite; JS validator only as a fallback that must pass the same suite |
| D3 | What happens to the cockpit's lane, action and config cards (open PR in this repository)? | Migrate them to Card Core kinds; keep today's JSON as `adapt` fixtures |
| D4 | First slice? | Inspector, read-only |
| D5 | Should `resolve` explain itself (per-key origin card)? | Yes, as an opt-in flag with output rows written first. Without it the Resolve view can show lineage and `defaults.used` only. |

## 11. Risks

| Risk | Mitigation |
| --- | --- |
| A host re-serialises a card and hides a lint error | WB-RAW-01; `ICardSource` yields bytes only |
| Engine size hurts first load on phones | Size-optimised build, load the engine lazily on first card, budget test WB-PERF-01 |
| The `jsonschema` crate's error structure changes on upgrade | The suite and WB-INS-01 are suite-derived and would fail |
| The UI grows its own rules over time | WB-INS-01 and a review rule: a rule in a component is a bug in the spec |
| Scope creep into editing | v0 is read-only by test (WB-RO-01); editing gets its own proposal |
