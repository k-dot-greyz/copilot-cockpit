# Contributing to Copilot Cockpit

Thank you for helping build the GitHub Copilot agent surface dashboard. This repository is an **AI integration interface**: it documents, visualizes, and operationalizes how Copilot surfaces fit into a real development pipeline—not a generic app repo.

Contributions here must stay **product-facing** (user- and integrator-visible docs, UI, data contracts, and validation). Internal monorepo workflows, fork guides, and orchestration notes belong in upstream consumer repos, not in this tree.

---

## What belongs in this repository

| In scope | Out of scope |
| --- | --- |
| Cockpit UI, static/live data for agent surfaces | Monorepo cold-boot guides, dex routing, submodule bump procedures |
| Prompt templates, agent command snippets shown in the UI | Private env setup for `dev-master` or other superprojects |
| JSON/TypeScript schemas for Copilot/GitHub API payloads | Copy-pasted `AGENTS.md` / internal protocol dumps |
| Product README, this file, `dex-entry.md` (registry metadata) | Fork-specific or team-internal workflow markdown |

---

## Repository layout

Current tree (rescue phase) and target layout for the Astro rebuild. Paths marked *(planned)* are not required to exist yet; add them only when implementing the related epic in `tasks.md`.

| Path | Role |
| --- | --- |
| `README.md` | Product overview, keyboard shortcuts, integration summary |
| `CONTRIBUTING.md` | Contributor standards (this file) |
| `dex-entry.md` | Dex registry metadata (`dex_id`, tags, status) for ecosystem indexing |
| `tasks.md` | Public roadmap / epics (rescue, rebuild, data, deploy) |
| `package.json` | Astro/TypeScript toolchain and scripts |
| `astro.config.mjs` | Build and integration config (no hardcoded secrets) |
| `vercel.json` *(planned)* | Deployment config |
| `public/` *(planned)* | Static assets (favicon, fonts, immutable JSON snapshots) |
| `src/` *(planned)* | Application source |
| `src/pages/` *(planned)* | Route-level views (Agent Matrix, Triage, Bug Fix, Release Prep) |
| `src/components/` *(planned)* | Presentational UI; no embedded business rules |
| `src/lib/` *(planned)* | Domain logic: ranking, command generation, API adapters |
| `src/lib/validation/` *(planned)* | Schema validators for AI/API payloads at the boundary |
| `src/lib/interfaces/` *(planned)* | Contracts (`IAgentSurface`, `IIssueSource`, `ICommandGenerator`, etc.) |
| `src/data/` *(planned)* | Versioned static JSON (agent matrix, workflow templates) |
| `src/legacy/` *(planned)* | Archived Perplexity Computer export (reference only) |
| `.github/` *(planned)* | Copilot instructions, issue/PR templates (product repo standards) |

---

## Architecture expectations (GlitchWorks Agnostic)

Copilot Cockpit treats **AI outputs and third-party API responses as hostile input** until validated.

1. **Zero hardcoding** — Ports, org names, repo slugs, and API tokens come from environment variables or injected config at runtime/build time, not string literals in components.
2. **Polymorphism by default** — UI and workflows depend on interfaces (`IIssueSource`, `IAgentCatalog`, `IWorkflowCard`), not concrete GitHub client classes.
3. **Open piping** — Cross-view state changes flow through typed events or message payloads; avoid mutating shared module-level singletons.
4. **Boundary validation** — Every path that accepts Copilot suggestions, generated commands, or GitHub API JSON must pass through `src/lib/validation/` (or equivalent) before render or clipboard copy.
5. **State hydration** — Serializable view state (`exportState` / `loadState`) for deep links and future persistence; no opaque closures holding API data.
6. **Graceful degradation** — Failed fetches, rate limits, and schema mismatches surface actionable UI errors; no uncaught exceptions in the client bundle.
7. **Agnostic telemetry** — Analytics/logging behind an injected provider; core logic emits structured events without knowing the sink.

---

## Prompt and AI-integration boundaries

- **Prompts live in data or templates**, not scattered in JSX. User-visible Copilot assignment strings belong in `src/data/` or validated template modules with explicit variable slots.
- **No prompt injection surfaces** — Never interpolate raw issue titles, usernames, or PR bodies into prompts without escaping and length limits. Treat display text and executable commands as separate channels.
- **Command vs display** — Clipboard and “run this” blocks must be generated from validated structs, not string concatenation in components.
- **Model references are documentation** — Model IDs in the UI are informational; runtime must not assume a specific model unless configured via env/schema.
- **Agent surface matrix is canonical** — Changes to tiers, capabilities, or permission models require updating the static catalog schema and Agent Matrix tests.

---

## Quality gates

All PRs that touch AI-related code, data contracts, or workflow generation must satisfy these gates before merge.

### 1. Prompt and template validation

- [ ] New or changed prompt/command templates have a JSON Schema (or Zod equivalent) defining allowed fields and max lengths.
- [ ] Template unit tests cover: minimal valid payload, missing required fields, oversize strings, and unknown keys rejected.
- [ ] No template reads directly from `localStorage`, cookies, or URL query params without validation.

### 2. AI / API output schema checks

- [ ] GitHub API responses parsed through typed adapters; `unknown` is not passed into React props.
- [ ] Breaking API shape changes bump schema version in `src/data/` or adapter layer and update fixtures.
- [ ] Golden-file fixtures for at least one real-shaped issue list and one workflow card payload.

### 3. Static analysis and tests

- [ ] `npm run build` (or `astro check` + build) passes with zero errors once the Astro scaffold exists.
- [ ] `npm run test` (or project test runner) passes; new validation rules include tests.
- [ ] TypeScript `strict` enabled for `src/`; no `any` on boundary parsers.

### 4. UI and accessibility

- [ ] Keyboard shortcuts `1`–`4` remain functional for primary views.
- [ ] Code blocks remain copy-safe (validated text only).
- [ ] WCAG 2.2 AA contrast and focus order checked for new interactive controls.

### 5. Security and secrets

- [ ] No tokens, PATs, or private keys in repo files or client bundles.
- [ ] GitHub API calls that need auth run server-side or via documented env vars on Vercel—not embedded in static export.

---

## Development workflow

1. **Fork or branch** — Branch from `main` using conventional prefixes: `feat/`, `fix/`, `docs/`, `chore/`.
2. **Align with `tasks.md`** — Note which epic your change supports; avoid drive-by refactors outside that scope.
3. **Implement at the boundary** — Add parsers and schemas before wiring UI.
4. **Verify locally** — Run build, tests, and manual keyboard navigation through affected views.
5. **Commit** — [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): description` (e.g. `feat(triage): validate issue payload schema`).
6. **Open a PR** — Clear summary, test plan checklist, and screenshots for UI changes. Link related GitHub issues when applicable.

---

## Commit message format

```
type(scope): imperative description

Optional body with rationale and breaking-change notes.
```

| Type | Use for |
| --- | --- |
| `feat` | New views, data, or user-visible behavior |
| `fix` | Bug fixes, incorrect commands, schema corrections |
| `docs` | README, CONTRIBUTING, dex-entry only |
| `refactor` | Internal structure without behavior change |
| `test` | Fixtures, validators, test harness |
| `chore` | Tooling, deps, CI |

---

## Pull request checklist

Copy into your PR description:

- [ ] Scope is product/code only (no monorepo-internal guides)
- [ ] AI/API payloads validated at boundary; tests added or updated
- [ ] No secrets or environment-specific hardcoding
- [ ] Keyboard shortcuts and copy-to-clipboard behavior verified (if UI touched)
- [ ] `tasks.md` epic noted (or N/A for docs-only)

---

## Questions

Open a [GitHub issue](https://github.com/k-dot-greyz/copilot-cockpit/issues) with the `question` label for design or integration questions. For GlitchWorks-specific agent policy, refer to that product repo’s Copilot instructions—do not duplicate them here.
