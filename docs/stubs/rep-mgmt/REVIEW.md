# Rep Management Review — Open PR Reconciliation

**module:** `MOD-REP-MGMT-REVIEW`  
**dex_id:** `0x7D:0x12:MOD-REP-MGMT-REVIEW`  
**tags:** `rep-mgmt`, `review`, `merge-order`, `stacked-pr`

Checklist for maintainers and agents before merging follow-up work. Run after each epic lands.

---

## Current open PR inventory

| # | Title | Branch | Merge base | Risk | Action |
|---|-------|--------|------------|------|--------|
| [13](https://github.com/k-dot-greyz/copilot-cockpit/pull/13) | Pipeline scaffold | `greyzxcursor/cockpit-pipeline-hydration-todos-fa15` | `main` | Low | **Merge first** — entities + pipes + stub index |
| [10](https://github.com/k-dot-greyz/copilot-cockpit/pull/10) | CodeRabbit autofix #7 | `coderabbitai/autofix/6b87bf0` | #7 (merged) | Low | **Close** after MOD-KBD-GUARDS + MOD-PLAYWRIGHT-CONFIG land |
| [8](https://github.com/k-dot-greyz/copilot-cockpit/pull/8) | PR read parity | `feat/pr-read-parity` | `main` | High | **Rebase** post-#13; run MOD-PR-PARITY-SYNC |
| [11](https://github.com/k-dot-greyz/copilot-cockpit/pull/11) | Astro bump | dependabot | `main` | Low | Merge anytime |

---

## Recommended merge order

```
1. #13  → main     (planning + joint entities + stub index)
2. Tier 0 follow-ups (MOD-TEST-NITPICK, MOD-KBD-GUARDS, MOD-PLAYWRIGHT-MIGRATE)
3. Close #10       (superseded)
4. #11             (dependabot — independent)
5. Rebase #8       → resolve entity conflicts via MOD-PR-PARITY-SYNC
6. #8              → main     (GraphQL read parity)
7. Tier 2+         (E2E, duplicates UI, views, deploy)
```

---

## Branch hygiene checks

- [ ] No force-push on shared branches without explicit maintainer approval
- [ ] Branch names follow `greyzxcursor/<descriptive>-fa15` for agent PRs
- [ ] Stacked PRs declare base branch in description (not always `main`)
- [ ] CodeRabbit autofix PRs closed once manual fix PR merges
- [ ] Dependabot PRs pass `npm run test` before merge

---

## Entity / pipe conflict zones (#8 vs #13)

When rebasing #8 onto post-#13 `main`, expect conflicts in:

| File | Resolution strategy |
|------|---------------------|
| `src/lib/github.ts` | Keep GraphQL fetch; delegate REST mapping to `hydratePRCard` |
| `src/lib/entities/pr-card.ts` | Extend `PRCardEntity` with optional GraphQL fields |
| `src/lib/validation/pr-url.ts` | Keep stricter #7 allowlist; merge #8 markdown sanitizer separately |
| `playwright.config.ts` | Use MOD-PLAYWRIGHT-CONFIG canonical config |
| `PRDashboard.tsx` | Merge FilterBar/PRDetail from #8; keep keyboard guards from #7 |

---

## PR review hydration checklist

For each incoming PR, verify:

1. **Boundary** — API/AI payloads pass validation pipes before render
2. **Secrets** — No PATs, tokens, or `.env` in diff
3. **Tests** — `npm run test` green; E2E only if UI touched
4. **Dex card** — Module ID referenced in PR body if part of pipeline
5. **Stub index** — New planned work added to `docs/stubs/INDEX.md` + dex card
6. **tasks.md** — Epic checkbox updated or N/A noted

---

## Automation stub

Programmatic review entry point: `src/lib/stubs/rep-mgmt/pr-hydration-review.stub.ts`

Future: emit `DexAssetCard` per open PR with merge-risk metadata for dex pipeline indexing.
