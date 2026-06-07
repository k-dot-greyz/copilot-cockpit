# Copilot Cockpit — Tasks

## Epic: COCKPIT-TRIAGE-001 — PR Triage Happy Path (MVP)

**User story:** As a maintainer drowning in bot PR floods, I want a single-screen triage cockpit so I can nuke duplicates and focus on human-ready PRs in under two minutes.

### Happy path UX flow

| Step | Actor action | System response |
|------|--------------|-----------------|
| 1 | Open dashboard (no stored token) | Token modal — PAT with `repo` scope, stored in `localStorage` only |
| 2 | Click **Connect** | `validateToken` → modal closes, `@username` in header |
| 3 | — (automatic) | Paginated fetch of open PRs from `k-dot-greyz/dev-master` with progress bar |
| 4 | Scan stat bar | Total · Ready · Drafts · Human · Bot · 🚨 Flood (if any) |
| 5a | **Flood path:** click **☢ Nuke N PRs** on flood alert | Confirm dialog → sequential close + branch delete → progress bar → flood section clears |
| 5b | **Human path:** review **🔥 Your PRs — Ready for Review** | PR cards with author badge, draft/ready, relative time, **View** link |
| 6 | Optional: checkbox-select PRs → **Close N selected** | Confirm → bulk close with progress; partial failures surface in error banner |
| 7 | Press **R** or click **↻ Refresh** | Re-fetch; empty repo shows **No open PRs found. 🎉** |

### Priority lane order (top → bottom)

1. 🔥 Human — Ready for Review *(action first)*
2. 📝 Human — Drafts
3. 🧪 Bot Test/Security Coverage
4. 🤖 Bot — Other
5. 🚨 Bot Flood (Duplicates)
6. 👥 External

### Acceptance criteria

- [x] Token auth with invalid-token recovery (re-prompt modal)
- [x] Auto-categorize into 6 lanes via `categorizePRs`
- [x] Flood detection at ≥10 `greyzxc/<prefix>-<hash>` branches
- [x] One-click flood nuke with confirm + progress
- [x] Bulk close selected with partial-failure reporting
- [x] Keyboard `R` refresh (skipped when focused in input or during close)
- [ ] Surface `findDuplicates` in UI (tested, not wired yet)
- [ ] E2E smoke test against mocked GitHub API

---

## Epic: COCKPIT-RESCUE-001 — Recover Perplexity Computer build

- [ ] Export HTML/CSS/JS from Perplexity Computer deployment
- [ ] Commit raw build to `src/legacy/` for reference
- [ ] Document what was live vs. what was scaffolded

## Epic: COCKPIT-REBUILD-001 — Astro rebuild

- [ ] Scaffold Astro + TypeScript project
- [ ] Implement Agent Matrix view (keyboard nav: `1`)
- [ ] Implement Issue Triage view (`2`) — live GitHub API
- [ ] Implement Bug Fix pipeline view (`3`)
- [ ] Implement Release Prep view (`4`)
- [ ] Code block click-to-copy
- [ ] zenOS dark theme

## Epic: COCKPIT-DATA-001 — Live data integration

- [ ] GitHub API: fetch open issues from GlitchWorks
- [ ] Severity ranking logic
- [ ] Copilot assignment command generation
- [ ] PR status polling

## Epic: COCKPIT-DEPLOY-001 — Vercel

- [ ] vercel.json config
- [ ] Deploy from main branch
- [ ] Custom domain (TBD: cockpit.glitchworks.tech?)
