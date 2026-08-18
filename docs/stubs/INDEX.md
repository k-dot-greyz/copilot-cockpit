# Follow-Up Stub Tree Index

**dex_id:** `0x7D:0x12`  
**parent:** `0x7D:0x11` (COCKPIT-PIPELINE-002)  
**purpose:** Scaffolded index of missing implementations and future upgrades for **out-of-band** issue/PR creation.  
**status:** `planning`  
**tags:** `stubs`, `follow-up`, `index`, `rep-mgmt`, `dev-dx`, `quickstart`

> This tree is **not** implemented in PR #13. Each leaf is a self-contained follow-up unit — copy the suggested issue title, link the dex card, and ship independently.

## Quick links

| Area | Entry |
|------|-------|
| Stub tree (visual) | [TREE.md](./TREE.md) |
| Rep management review | [rep-mgmt/REVIEW.md](./rep-mgmt/REVIEW.md) |
| Dev DX quickstart (organic + agentic) | [dev-dx/QUICKSTART.md](./dev-dx/QUICKSTART.md) |
| Issue templates (copy-paste) | [issues/](./issues/) |
| Code stubs | [`src/lib/stubs/`](../../src/lib/stubs/) |
| Dex cards | [`dex/cards/`](../../dex/cards/) |

---

## Open PR reconciliation (rep mgmt)

| PR | Branch | Blocker | Follow-up |
|----|--------|---------|-----------|
| [#13](https://github.com/k-dot-greyz/copilot-cockpit/pull/13) | `greyzxcursor/cockpit-pipeline-hydration-todos-fa15` | Planning scaffold | Merge first — unblocks entity/pipe wiring |
| [#10](https://github.com/k-dot-greyz/copilot-cockpit/pull/10) | `coderabbitai/autofix/6b87bf0` | Superseded by MOD-KBD-GUARDS + MOD-PLAYWRIGHT-CONFIG | Close after Tier 0 absorbs fixes |
| [#8](https://github.com/k-dot-greyz/copilot-cockpit/pull/8) | `feat/pr-read-parity` | Needs MOD-PR-PARITY-SYNC + #13 merge | Rebase onto main post-#13; extend `PRCardEntity` |
| [#11](https://github.com/k-dot-greyz/copilot-cockpit/pull/11) | dependabot | None | Merge independently |

See [rep-mgmt/REVIEW.md](./rep-mgmt/REVIEW.md) for full merge-order checklist.

---

## Stub categories

### A — Pipeline hardening (from COCKPIT-PIPELINE-002)

Already have dex cards. Stubs confirm file targets.

| ID | Status | Stub | Dex card |
|----|--------|------|----------|
| MOD-TEST-NITPICK | `stub` | — | `dex/cards/MOD-TEST-NITPICK.json` |
| MOD-KBD-GUARDS | `stub` | — | `dex/cards/MOD-KBD-GUARDS.json` |
| MOD-PLAYWRIGHT-MIGRATE | `stub` | — | `dex/cards/MOD-PLAYWRIGHT-MIGRATE.json` |
| MOD-PLAYWRIGHT-CONFIG | `stub` | — | `dex/cards/MOD-PLAYWRIGHT-CONFIG.json` |
| MOD-PLAYWRIGHT-E2E | `stub` | `tests/e2e-dashboard.spec.stub.ts` | `dex/cards/MOD-PLAYWRIGHT-E2E.json` |
| MOD-DUPLICATES-UI | `stub` | `src/lib/stubs/ui/duplicates-panel.stub.tsx` | `dex/cards/MOD-DUPLICATES-UI.json` |
| MOD-PR-PARITY-SYNC | `stub` | `src/lib/stubs/github/hydrate-pr-graphql.stub.ts` | `dex/cards/MOD-PR-PARITY-SYNC.json` |
| MOD-WIRE-PIPE-HYDRATE | `stub` | `src/lib/stubs/github/wire-hydrate-pipe.stub.ts` | `dex/cards/MOD-WIRE-PIPE-HYDRATE.json` |

### B — Dev DX & secure environment

| ID | Status | Stub | Dex card |
|----|--------|------|----------|
| MOD-ENV-SECURE | `stub` | `.env.example`, `scripts/lib/env-check.sh` | `dex/cards/MOD-ENV-SECURE.json` |
| MOD-QUICKSTART-ORGANIC | `stub` | `scripts/quickstart.sh` | `dex/cards/MOD-QUICKSTART-ORGANIC.json` |
| MOD-QUICKSTART-AGENTIC | `stub` | `scripts/quickstart-agent.sh` | `dex/cards/MOD-QUICKSTART-AGENTIC.json` |

### C — Rep management & review automation

| ID | Status | Stub | Dex card |
|----|--------|------|----------|
| MOD-REP-MGMT-REVIEW | `stub` | `docs/stubs/rep-mgmt/REVIEW.md`, `src/lib/stubs/rep-mgmt/pr-hydration-review.stub.ts` | `dex/cards/MOD-REP-MGMT-REVIEW.json` |
| MOD-CI-GATES | `stub` | `.github/workflows/ci.stub.yml` | `dex/cards/MOD-CI-GATES.json` |

### D — Architecture gaps (CONTRIBUTING planned paths)

| ID | Status | Stub | Dex card |
|----|--------|------|----------|
| MOD-INTERFACES | `stub` | `src/lib/stubs/interfaces/*.ts` | `dex/cards/MOD-INTERFACES.json` |
| MOD-STATE-HYDRATION | `stub` | `src/lib/stubs/state/*.ts` | `dex/cards/MOD-STATE-HYDRATION.json` |
| MOD-VIEWS-AGENT-MATRIX | `stub` | `src/lib/stubs/views/AgentMatrixView.stub.ts` | `dex/cards/MOD-VIEWS-AGENT-MATRIX.json` |
| MOD-VIEWS-ISSUE-TRIAGE | `stub` | `src/lib/stubs/views/IssueTriageView.stub.ts` | `dex/cards/MOD-VIEWS-ISSUE-TRIAGE.json` |
| MOD-VIEWS-BUG-FIX | `stub` | `src/lib/stubs/views/BugFixPipelineView.stub.ts` | `dex/cards/MOD-VIEWS-BUG-FIX.json` |
| MOD-VIEWS-RELEASE-PREP | `stub` | `src/lib/stubs/views/ReleasePrepView.stub.ts` | `dex/cards/MOD-VIEWS-RELEASE-PREP.json` |
| MOD-DATA-STATIC | `stub` | `src/lib/stubs/data/*.json` | `dex/cards/MOD-DATA-STATIC.json` |
| MOD-LEGACY-RESCUE | `stub` | `src/legacy/.gitkeep` | `dex/cards/MOD-LEGACY-RESCUE.json` |

### E — Deploy & ops

| ID | Status | Stub | Dex card |
|----|--------|------|----------|
| MOD-DEPLOY-VERCEL | `stub` | `vercel.json.stub` | `dex/cards/MOD-DEPLOY-VERCEL.json` |
| MOD-OAUTH-SERVERLESS | `stub` | `api/auth/token.stub.ts` | `dex/cards/MOD-OAUTH-SERVERLESS.json` |

---

## Suggested issue titles (copy-paste)

Each maps 1:1 to a dex card. Use labels: `stub-follow-up`, `tier-N`, module tag.

```
[MOD-TEST-NITPICK] Fix #7 review nitpicks (draft coercion + pagination mock)
[MOD-KBD-GUARDS] Text-input-only keyboard guard (absorb PR #10)
[MOD-QUICKSTART-ORGANIC] Secure env quickstart for organic developers
[MOD-QUICKSTART-AGENTIC] Non-interactive quickstart for cloud agents
[MOD-REP-MGMT-REVIEW] Open PR reconciliation and merge-order checklist
[MOD-WIRE-PIPE-HYDRATE] Replace mapPR with hydratePRCard in github.ts
[MOD-PR-PARITY-SYNC] Reconcile PRCardEntity with PR #8 GraphQL model
[MOD-VIEWS-AGENT-MATRIX] Implement Agent Matrix view (keyboard 1)
[MOD-STATE-HYDRATION] exportState / loadState for deep links
```

Full templates: [issues/](./issues/)

---

## Dependency tiers (follow-up PRs)

```
Tier 0 (no deps — ship anytime):
  MOD-TEST-NITPICK, MOD-KBD-GUARDS, MOD-PLAYWRIGHT-MIGRATE
  MOD-ENV-SECURE, MOD-QUICKSTART-ORGANIC, MOD-QUICKSTART-AGENTIC
  MOD-REP-MGMT-REVIEW, MOD-LEGACY-RESCUE

Tier 1:
  MOD-PLAYWRIGHT-CONFIG ← MOD-PLAYWRIGHT-MIGRATE
  MOD-WIRE-PIPE-HYDRATE ← MOD-JOINT-ENTITIES (merged in #13)
  MOD-INTERFACES, MOD-DATA-STATIC
  MOD-CI-GATES ← MOD-ENV-SECURE

Tier 2:
  MOD-PLAYWRIGHT-E2E ← MOD-PLAYWRIGHT-CONFIG
  MOD-DUPLICATES-UI, MOD-STATE-HYDRATION
  MOD-VIEWS-* (each independent once MOD-INTERFACES lands)

Tier 3:
  MOD-PR-PARITY-SYNC ← MOD-WIRE-PIPE-HYDRATE + #8
  MOD-OAUTH-SERVERLESS ← MOD-ENV-SECURE + #8
  MOD-DEPLOY-VERCEL ← MOD-CI-GATES
```

---

## Agentic vs organic DX

| Path | Entry | Non-interactive | Secrets |
|------|-------|-----------------|---------|
| **Organic** (human dev) | `npm run quickstart` → `scripts/quickstart.sh` | No — prompts for `.env` | Copy from `.env.example`; never commit |
| **Agentic** (cloud agent) | `npm run quickstart:agent` → `scripts/quickstart-agent.sh` | Yes — env vars only | `GITHUB_TOKEN` from injected env; no prompts |

Both paths run `scripts/lib/env-check.sh` before `npm install` / `npm test`.
