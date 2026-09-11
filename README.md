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
| Framework | Astro 7 + TypeScript + React 19 islands |
| Styling | CSS custom properties + transplanted `glitch-islands` RGB pulse |
| Data | JSON cards (`content/cockpit/`) + GitHub GraphQL |
| Core | `packages/cockpit-core` (Rust) + TS hydrate pipes |
| Deploy | Vercel |

---

## Keyboard Shortcuts

| Key | View |
|---|---|
| `R` | Refresh PRs |
| `⌘K` / `Ctrl+K` / `/` | Command palette |
| `J` / `K` | Next / previous PR |
| `X` | Toggle select focused PR |
| `I` | Inspect focused PR |
| `?` | Keyboard help |
| `Esc` | Close overlay |

---

## Integration Points

- **GlitchWorks**: `AGENTS.md`, `.github/copilot-instructions.md`, `.github/agents/`
- **dev-master**: `dex/08-projects/copilot-cockpit.md`
- **zenOS**: CODE_REVIEW_PROTOCOL, bouncer.agent.md

## Status

`perplexity-computer-prototype` → `rescue-to-git` → `rebuild-in-astro`

---

*dex_id: `0x7D:0x10` | Hosted: GlitchWorks · dev-master · zenOS*
