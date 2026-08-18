# AGENTS.md

## Cursor Cloud specific instructions

Copilot Cockpit is a single-page **Astro + React + TypeScript** static dashboard for
GitHub PR triage. There are no backend services, databases, or Docker runtime dependencies
for the app itself. Node `>=22.12.0` is required (see `package.json` `engines`).

### Commands (all defined in `package.json`)

- `npm run dev` — Astro dev server on `http://localhost:4321/` (HMR).
- `npm run build` — static production build into `dist/`.
- `npm run preview` — serve the built `dist/` output.
- `npm run test` — Vitest (`vitest run`). Tests live next to source as `*.test.ts`.
- `npm run env:check` — run env-doctor + Python 3.14 gate (non-interactive).
- `npm run env:init` — full env-doctor tier-3 init with `--yes`.

There is **no lint script** and `@astrojs/check` is not a declared dependency, so
`astro check` will prompt to install and should not be treated as a required gate.
Type-checking effectively happens through `npm run build` (Vite/esbuild).

### Tooling Workflows (env-doctor & git-butler)

- **Vendored env-doctor**: `vendor/env-doctor` git submodule (k-dot-greyz/env-doctor).
- **Automated Tool Hydration**:
  - `scripts/hydrate-tools.sh` runs during Cloud Agent `install` — submodule init, shims, `npm ci`, sitrep.
  - `scripts/start.sh` runs on boot — Python 3.14+ gate + silent `env-doctor -q`.
- **Python 3.14+ policy**:
  - Versions `< 3.14` are **banned**. `scripts/ensure-python314.sh` runs before any Python script.
  - Configure via `.env-doctor.conf` (`ENV_DOCTOR_MIN_PYTHON_MINOR=14`, `ENV_DOCTOR_PYTHON_PIN=3.14`).
  - Install hooks: `bash scripts/env-config.sh install`.
- **Environment Diagnostics (`env-doctor`)**:
  - `env-doctor -j` — JSON diagnostic stream.
  - `env-doctor -q` — silent exit-code health check before builds.
- **Git Flow (`git-butler` / `git-steward`)**:
  - `SKIP_CONFIRM=1 git-steward` — conventional commit + draft PR without LLM round-trips.

### Non-obvious gotchas

- The **entire UI is a single client island**: `src/pages/index.astro` renders
  `<PRDashboard client:only="react" />`. Syntax errors in `PRDashboard.tsx` yield HTTP 200
  with a **blank page** — check dev-server terminal / browser console.
- **GitHub PAT**: stored in `sessionStorage` under `cockpit-gh-token` for client-side REST calls.
