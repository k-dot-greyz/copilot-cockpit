# Copilot Cockpit 👨‍✈️

> GitHub Copilot agent surface dashboard — interactive developer cockpit for GlitchWorks / zenOS

Originally built via **Perplexity Computer** on 2026-03-31. Now rescued to git.
Hosted (preview): [Perplexity Computer deployment](https://www.perplexity.ai/computer/a/copilot-cockpit-glitchworks-de-rStGpl9TRXqgbKBH8lljmA)

---

## Purpose

Side-by-side interactive dashboard visualizing every GitHub Copilot agent surface and their integration into the GlitchWorks / zenOS development workflow.

**Built to answer:** *“what can each agent actually do, and where does it fit in our pipeline?”*

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
