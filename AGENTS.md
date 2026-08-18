# AGENTS.md

## Cursor Cloud specific instructions

Copilot Cockpit is a single-page **Astro + React + TypeScript** static dashboard for
GitHub PR triage. There is one product; there are no backend services, databases, or
Docker dependencies. Node `>=22.12.0` is required (see `package.json` `engines`).

### Commands (all defined in `package.json`)

- `npm run dev` — Astro dev server on `http://localhost:4321/` (HMR).
- `npm run build` — static production build into `dist/`.
- `npm run preview` — serve the built `dist/` output.
- `npm run test` — Vitest (`vitest run`). Tests live next to source as `*.test.ts`.

There is **no lint script** and `@astrojs/check` is not a declared dependency, so
`astro check` will prompt to install and should not be treated as a required gate.
Type-checking effectively happens through `npm run build` (Vite/esbuild).

### Tooling Workflows (env-doctor & git-butler)

- **Environment Diagnostics (`env-doctor`)**:
  - Run `bash env-doctor.sh -j` (or clone `k-dot-greyz/env-doctor`) for non-interactive JSON diagnostic streams.
  - The repo contains `.env-doctor.conf` configured for brand `copilot-cockpit` and Node `>=22.12.0` checks.
  - Use `-q` for silent exit-code health checks before launching builds.
- **Git Flow & Branch Hygiene (`git-butler` / `git-steward`)**:
  - For automated conventional commit and guided PR workflows without token-heavy LLM chat round-trips, run:
    `SKIP_CONFIRM=1 bash scripts/guided-pr-flow.sh`
  - Ensures clean branch naming (`greyzxcursor/<descriptive-name>-d7df`) and draft PR creation via `gh pr create --fill --draft`.

### Non-obvious gotchas

- The **entire UI is a single client island**: `src/pages/index.astro` renders
  `<PRDashboard client:only="react" />`. If `src/components/PRDashboard.tsx` fails to
  transform (e.g. a syntax error), the dev server still returns HTTP 200 with the HTML
  shell, but the page renders **blank** — check the dev-server terminal / browser
  console for the esbuild error rather than assuming the server is down.
- **Mock & Demo Data Support**:
  - The dashboard supports instant offline/demo testing via the "Use Demo Data" button in the token modal, or by hydrating state with fixtures from `src/lib/fixtures/pr.ts`.
  - To target a specific GitHub repository dynamically, set `PUBLIC_GITHUB_OWNER` and `PUBLIC_GITHUB_REPO` in environment variables (defaults to `k-dot-greyz/dev-master`).
- **GitHub PAT Authentication**:
  - When connecting to live GitHub data, a Personal Access Token with `repo` scope is stored in `sessionStorage` under `cockpit-gh-token` and used for client-side REST calls.
