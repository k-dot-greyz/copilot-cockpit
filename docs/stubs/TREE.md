# Stub Tree — copilot-cockpit

Visual index of scaffolded follow-up work. Legend: `[x]` done · `[ ]` stub · `(card)` dex card id

```
copilot-cockpit/
├── docs/stubs/                          # Follow-up index (this tree)
│   ├── INDEX.md                         [x] master index
│   ├── TREE.md                          [x] this file
│   ├── rep-mgmt/
│   │   └── REVIEW.md                    [x] open PR merge-order checklist
│   ├── dev-dx/
│   │   └── QUICKSTART.md                [x] organic + agentic bootstrap guide
│   └── issues/
│       ├── MOD-QUICKSTART-ORGANIC.md    [x] issue template
│       ├── MOD-QUICKSTART-AGENTIC.md    [x] issue template
│       └── MOD-REP-MGMT-REVIEW.md       [x] issue template
│
├── scripts/
│   ├── quickstart.sh                    [ ] (MOD-QUICKSTART-ORGANIC)
│   ├── quickstart-agent.sh              [ ] (MOD-QUICKSTART-AGENTIC)
│   └── lib/
│       └── env-check.sh                 [ ] (MOD-ENV-SECURE)
│
├── .env.example                         [ ] (MOD-ENV-SECURE)
├── vercel.json.stub                     [ ] (MOD-DEPLOY-VERCEL)
│
├── .github/
│   └── workflows/
│       └── ci.stub.yml                  [ ] (MOD-CI-GATES)
│
├── api/auth/
│   └── token.stub.ts                    [ ] (MOD-OAUTH-SERVERLESS) ← PR #8
│
├── dex/cards/
│   ├── index.json                       [x] manifest (extend with new cards)
│   ├── MOD-*.json                       [x] pipeline cards (#13)
│   ├── MOD-ENV-SECURE.json              [ ] new
│   ├── MOD-QUICKSTART-ORGANIC.json      [ ] new
│   ├── MOD-QUICKSTART-AGENTIC.json      [ ] new
│   ├── MOD-REP-MGMT-REVIEW.json         [ ] new
│   ├── MOD-WIRE-PIPE-HYDRATE.json       [ ] new
│   ├── MOD-CI-GATES.json                [ ] new
│   ├── MOD-INTERFACES.json              [ ] new
│   ├── MOD-STATE-HYDRATION.json         [ ] new
│   ├── MOD-VIEWS-*.json                 [ ] new (×4)
│   ├── MOD-DATA-STATIC.json             [ ] new
│   ├── MOD-LEGACY-RESCUE.json           [ ] new
│   ├── MOD-DEPLOY-VERCEL.json           [ ] new
│   └── MOD-OAUTH-SERVERLESS.json        [ ] new
│
├── src/
│   ├── legacy/
│   │   └── .gitkeep                     [ ] (MOD-LEGACY-RESCUE)
│   │
│   ├── lib/
│   │   ├── entities/                    [x] joint entities (#13)
│   │   ├── pipes/                         [x] hydrate/sanitize/dex (#13)
│   │   │
│   │   ├── github.ts                      [x] mapPR (not yet wired to pipe)
│   │   ├── triage.ts                      [x] findDuplicates (UI not wired)
│   │   ├── keyboard-guards.ts             [x] needs MOD-KBD-GUARDS fix
│   │   │
│   │   ├── interfaces/                    [ ] planned (CONTRIBUTING)
│   │   │   └── → stubs/interfaces/      [ ] MOD-INTERFACES
│   │   │
│   │   ├── stubs/                         [ ] follow-up code stubs
│   │   │   ├── index.ts
│   │   │   ├── interfaces/
│   │   │   │   ├── IAgentSurface.stub.ts
│   │   │   │   ├── IIssueSource.stub.ts
│   │   │   │   ├── ICommandGenerator.stub.ts
│   │   │   │   └── IWorkflowCard.stub.ts
│   │   │   ├── views/
│   │   │   │   ├── AgentMatrixView.stub.ts      (MOD-VIEWS-AGENT-MATRIX)
│   │   │   │   ├── IssueTriageView.stub.ts      (MOD-VIEWS-ISSUE-TRIAGE)
│   │   │   │   ├── BugFixPipelineView.stub.ts   (MOD-VIEWS-BUG-FIX)
│   │   │   │   └── ReleasePrepView.stub.ts      (MOD-VIEWS-RELEASE-PREP)
│   │   │   ├── state/
│   │   │   │   ├── exportState.stub.ts          (MOD-STATE-HYDRATION)
│   │   │   │   └── loadState.stub.ts
│   │   │   ├── github/
│   │   │   │   ├── wire-hydrate-pipe.stub.ts    (MOD-WIRE-PIPE-HYDRATE)
│   │   │   │   └── hydrate-pr-graphql.stub.ts   (MOD-PR-PARITY-SYNC)
│   │   │   ├── ui/
│   │   │   │   └── duplicates-panel.stub.tsx    (MOD-DUPLICATES-UI)
│   │   │   ├── rep-mgmt/
│   │   │   │   └── pr-hydration-review.stub.ts  (MOD-REP-MGMT-REVIEW)
│   │   │   └── data/
│   │   │       ├── agent-matrix.stub.json       (MOD-DATA-STATIC)
│   │   │       └── workflow-templates.stub.json
│   │   │
│   │   └── validation/                  [x] pr-url.ts
│   │       └── graphql.ts               [ ] PR #8 only
│   │
│   ├── components/
│   │   └── PRDashboard.tsx              [x] triage MVP
│   │       ├── FilterBar.tsx            [ ] PR #8
│   │       └── PRDetail.tsx             [ ] PR #8
│   │
│   ├── data/                            [ ] planned static JSON
│   └── pages/
│       └── index.astro                  [x] single route (multi-view stubs pending)
│
└── tests/
    ├── security.spec.ts                 [x] → migrate (MOD-PLAYWRIGHT-MIGRATE)
    ├── ux-user-story.spec.ts            [x] → migrate
    └── e2e-dashboard.spec.stub.ts       [ ] (MOD-PLAYWRIGHT-E2E)
```

## Epic mapping

| Epic (tasks.md) | Stub modules |
|-----------------|--------------|
| COCKPIT-TRIAGE-001 | MOD-DUPLICATES-UI, MOD-PLAYWRIGHT-E2E |
| COCKPIT-PIPELINE-002 | MOD-TEST-NITPICK … MOD-PR-PARITY-SYNC |
| COCKPIT-RESCUE-001 | MOD-LEGACY-RESCUE |
| COCKPIT-REBUILD-001 | MOD-VIEWS-*, MOD-INTERFACES, MOD-DATA-STATIC |
| COCKPIT-DATA-001 | MOD-VIEWS-ISSUE-TRIAGE, MOD-DATA-STATIC |
| COCKPIT-DEPLOY-001 | MOD-DEPLOY-VERCEL, MOD-CI-GATES |
| *(new)* COCKPIT-DEVDX-001 | MOD-ENV-SECURE, MOD-QUICKSTART-* |
| *(new)* COCKPIT-REPMGMT-001 | MOD-REP-MGMT-REVIEW |
