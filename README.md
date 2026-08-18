# Copilot Cockpit 👨‍✈️

> GitHub Copilot agent surface dashboard — interactive developer cockpit for GlitchWorks / zenOS

Originally built via **Perplexity Computer** on 2026-03-31. Now rescued to git.
Hosted (preview): [Perplexity Computer deployment](https://www.perplexity.ai/computer/a/copilot-cockpit-glitchworks-de-rStGpl9TRXqgbKBH8lljmA)

---

## Purpose

Side-by-side interactive dashboard visualizing every GitHub Copilot agent surface and their integration into the GlitchWorks / zenOS development workflow.

**Built to answer:** *“what can each agent actually do, and where does it fit in our pipeline?”*

---

## 🚀 PR Triage Happy Path (Epic: COCKPIT-TRIAGE-001)

The dashboard provides a dedicated, high-speed triage interface built specifically for maintainers to handle bot PR floods and prioritize human reviews in under two minutes.

### The Happy Path Flow

| Step | Actor Action | System Response |
| :--- | :--- | :--- |
| **1** | Open dashboard (no stored token) | Prompt with a secure Token Modal requesting a GitHub Personal Access Token (PAT) with `repo` scope. |
| **2** | Input PAT and click **Connect** | `validateToken` runs. On success, the modal closes, storing the PAT in `sessionStorage` (never on disk) and displaying `@username` in the header. |
| **3** | — *(automatic)* | Triggers a paginated fetch of open PRs from `k-dot-greyz/dev-master` with an active loading progress bar. |
| **4** | Scan Stat Bar | Displays real-time counts: **Total PRs** · **Ready for Review** · **Drafts** · **Human Authors** · **Bot Authors** · **🚨 Flood Detected** (if any). |
| **5a** | **Flood Path:** Click **☢ Nuke N PRs** on the flood alert | Triggers a confirmation dialog. Upon approval, sequentially closes all flood PRs and deletes their head branches with a progress bar, clearing the flood lane. |
| **5b** | **Human Path:** Review **🔥 Your PRs — Ready for Review** | Renders prioritized PR cards sorted newest-first, complete with author badges, draft/ready state, relative timestamps, and direct **View** links. |
| **6** | Optional: Checkbox-select PRs → **Close N selected** | Triggers confirmation, then bulk-closes selected PRs. Any partial failures are gracefully surfaced in a top-level error banner. |
| **7** | Press **R** or click **↻ Refresh** | Re-fetches all open PRs. If the repository is clean, displays: *“No open PRs found. 🎉”* |

### Priority Lane Order (Top → Bottom)

1. **🔥 Human — Ready for Review** *(action first)*
2. **📝 Human — Drafts**
3. **🧪 Bot Test/Security Coverage**
4. **🤖 Bot — Other**
5. **🚨 Bot Flood (Duplicates)**
6. **👥 External**

### Automated Verification

This happy path is fully verified by an end-to-end integration test in **Vitest**:
- **Test File:** `src/lib/happy-path.test.ts`
- **What it covers:** Token validation, paginated fetching, stat calculation, multi-lane categorization, and a full mock-nuke sequence (sequentially closing 12 flood PRs and deleting their branches) followed by post-nuke state verification.
- **Run command:** `npm run test`
- **Coverage:** 139+ unit tests across triage, OAuth, filters, GraphQL validation, and the happy-path integration suite.

---

## OAuth Login

In addition to manual PAT entry, the dashboard supports GitHub OAuth for a one-click login flow.

### Flow

1. User clicks **Sign in with GitHub** → browser redirects to `https://github.com/login/oauth/authorize` with `client_id`, `scope` (`repo,read:org,user`), and a random `state` value.
2. GitHub redirects back to the app callback URL with `?code=…&state=…`.
3. Client validates `state` against the value stored in `sessionStorage` (CSRF protection), then POSTs the `code` to `/api/auth/token`.
4. The serverless function exchanges the code for an access token using `GITHUB_CLIENT_SECRET` and returns it to the client.
5. Token is stored in `sessionStorage` (never on disk) and OAuth query params are stripped from the URL.

### Environment Variables

| Variable | Where | Purpose |
| :--- | :--- | :--- |
| `PUBLIC_GITHUB_CLIENT_ID` | Client + server | GitHub OAuth App client ID (public) |
| `GITHUB_CLIENT_SECRET` | Server only | Secret used to exchange authorization codes |
| `ALLOWED_ORIGINS` | Server only | Comma-separated list of allowed CORS origins for `/api/auth/token` |

### Callback URL Setup

In your GitHub OAuth App settings, set the **Authorization callback URL** to your deployment origin (e.g. `https://cockpit.glitchworks.tech/` or `http://localhost:4321/` for local dev). The app uses `window.location.origin + window.location.pathname` as the `redirect_uri`.

### CSRF State Protection

Before redirecting to GitHub, `createOAuthState()` generates a UUID and stores it in `sessionStorage` under `cockpit-oauth-state`. On callback, `validateOAuthState()` compares the returned `state` param, clears the stored value, and rejects mismatches.

---

## PR Filters & Detail Drawer

### FilterBar

The **Filter Console** above the triage lanes supports multi-dimensional filtering:

| Dimension | Options |
| :--- | :--- |
| **Search** | Title, branch name, or `#number` |
| **PR State** | Open · Closed · Merged · All |
| **Author Type** | All · Human · Bot · External |
| **Label** | Dynamic list from fetched PRs |
| **Review Decision** | Approved · Changes Requested · Review Required · None |
| **CI Checks** | Success · Failure · Pending · None |
| **Draft Status** | All · Draft Only · Ready Only |

Filters apply client-side on top of the fetched PR list. Changing **PR State** triggers a re-fetch from the GitHub API. A **Reset Filters** button appears when any non-default filter is active.

### Inspect Drawer

Each PR card has an **Inspect** button that opens a slide-over detail drawer fetched via GraphQL:

- **Plain-text description** — rendered with `white-space: pre-wrap` (no HTML injection)
- **Focus trap** — Tab cycles within the drawer; `Escape` closes and restores focus
- **Linked issues** — closing-issue references with sanitized GitHub URLs
- **Files changed** — path list with per-file addition/deletion counts
- **Reviews** — author, state badge, and review body (plain text)
- **Commits** — abbreviated SHA and commit message

Avatar URLs from the GraphQL response are sanitized to `https://avatars.githubusercontent.com/` hosts only.

---

## What It Shows

### Agent Matrix

| Surface | Tier | Key capability |
|---|---|---|
| Copilot CLI | Free | `gh copilot suggest/explain` — terminal command assist |
| Agent Mode | Pro | Multi-file edits, terminal commands, in-editor iteration |
| Coding Agent | Pro+ | Issues → PRs autonomously, GitHub Actions VM, async |
| Code Review | Pro | Agentic PR review, “Implement suggestion” → Coding Agent |

### Workflow Cards

- **Issue Triage** — All open GlitchWorks issues, severity-ranked, Copilot assignment commands ready
- **Bug Fix** — Full pipeline: diagnose → assign `@copilot` → agent flow → diff quality → Bouncer verdict
- **Release Prep** — v2.4.5 → v2.5.0 pipeline: branch audit, 8 quality gates, tag + release commands

---

## Stack (rebuild target)

| Layer | Tech |
|---|---|
| Framework | Astro + TypeScript |
| Styling | CSS custom properties (zenOS theme) |
| Data | Static JSON + GitHub API (live issues/PRs) |
| Deploy | Vercel |

---

## Keyboard Shortcuts

| Key | View |
|---|---|
| `1` | Agent Matrix |
| `2` | Issue Triage |
| `3` | Bug Fix |
| `4` | Release Prep |
| Click code block | Copy to clipboard |

---

## Integration Points

- **GlitchWorks**: `AGENTS.md`, `.github/copilot-instructions.md`, `.github/agents/`
- **dev-master**: `dex/08-projects/copilot-cockpit.md`
- **zenOS**: CODE_REVIEW_PROTOCOL, bouncer.agent.md

## Status

`perplexity-computer-prototype` → `rescue-to-git` → `rebuild-in-astro`

---

*dex_id: `0x7D:0x10` | Hosted: GlitchWorks · dev-master · zenOS*
