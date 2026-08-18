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

### Non-obvious gotchas

- The **entire UI is a single client island**: `src/pages/index.astro` renders
  `<PRDashboard client:only="react" />`. If `src/components/PRDashboard.tsx` fails to
  transform (e.g. a syntax error), the dev server still returns HTTP 200 with the HTML
  shell, but the page renders **blank** — check the dev-server terminal / browser
  console for the esbuild error rather than assuming the server is down.
- **No mock/demo data path.** On load the dashboard shows a token modal and expects a
  **GitHub Personal Access Token** (`repo` scope), stored in `sessionStorage` under
  `cockpit-gh-token`. It then hits the live GitHub REST API for open PRs of
  `k-dot-greyz/dev-master` (hardcoded `OWNER`/`REPO` in `PRDashboard.tsx`). A full
  end-to-end UI hello-world therefore needs a valid PAT; without one you can only reach
  the token modal. Core triage/client logic is covered without a token via the Vitest
  suites (`src/lib/*.test.ts`).
