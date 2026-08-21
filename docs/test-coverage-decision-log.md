# Test coverage decision log — agentic security & UX boundaries

**Epic:** COCKPIT-TRIAGE-001 / PR read parity / OAuth flow  
**Branch:** `greyzxcursor/agentic-security-test-coverage-7c3c`  
**Date:** 2026-08-18

## Attack surface map

| Surface | Input source | Failure mode if unvalidated | Coverage |
| --- | --- | --- | --- |
| PR / issue `href` | GitHub REST + GraphQL | Open redirect, `javascript:` XSS | `pr-url.test.ts`, `graphql.test.ts`, `security.spec.ts`, `github.test.ts` |
| OAuth callback | URL query `code` + `state` | CSRF token fixation, code replay | `oauth.test.ts`, `security.spec.ts` (state harness) |
| OAuth token exchange API | POST body `code` | Secret leakage via error bodies | `token-handler.test.ts`, `oauth.test.ts` |
| CORS on `/api/auth/token` | `Origin` header | Cross-site token exchange abuse | `token-handler.test.ts` |
| PR title / body / reviews | GraphQL detail | Prompt-style injection in UI text | Rendered as text nodes (React); URLs sanitized at boundary |
| Filter search | User keyboard input | Logic injection / ReDoS | `filters.test.ts`, `security.spec.ts` (injection queries) |
| Author classification | API `login` + `type` | Wrong triage lane → destructive bulk close | `author-classification.test.ts`, triage tests |
| Keyboard `R` refresh | User during bulk-close | Race: refresh mid-nuke | `keyboard-guards.test.ts`, `security.spec.ts` |
| Flood nuke threshold | Branch naming pattern | Premature or missed flood detection | `triage.test.ts`, `security.spec.ts` |
| PAT in modal | User paste | Token exfil if sent to wrong host | Client sends only to `api.github.com` (documented); no server PAT storage |

## Prioritization rationale

### High impact / added this pass

1. **Author classification** — shared by REST `mapPR` and GraphQL validators; misclassification routes PRs into nuke-eligible lanes.
2. **OAuth CSRF state** — constructor-driven Playwright scenarios mirror real callback attacks without browser automation flake.
3. **CORS allowlist rejection** — closes gap where disallowed origins could receive credentialed responses when `ALLOWED_ORIGINS` is set.
4. **Hostile GraphQL detail payloads** — ensures linked-issue URLs cannot become open redirects in PR drawer.
5. **Filter search injection strings** — proves search is pure filtering, not eval or query construction.

### Already well covered (no new tests)

- Happy-path triage E2E in `happy-path.test.ts`
- GraphQL PR mapping edge cases in `graphql.test.ts`
- Bulk close partial failure in `github.test.ts`
- Filter matrix in `filters.test.ts`

### Deferred follow-ups (not in this PR)

- **Component-level React tests** for `PRDetail` / `PRDashboard` (needs `@testing-library/react` — avoid new flaky DOM harness unless E2E gap proven).
- **Browser E2E against mocked GitHub** (`tasks.md` checkbox) — requires MSW or Playwright route interception; tracked separately.
- **Env-driven `KNOWN_TEAM_MEMBERS`** — product hardening per CONTRIBUTING zero-hardcoding; config change + migration test.
- **`findDuplicates` UI wiring** — feature gap, not a test gap.

## Harness design

`src/lib/test-harness/security-scenarios.ts` defines scenario classes with constructor-injected values. Playwright imports `SecurityPlaywrightScenarios` so security regressions stay aligned with unit tests without duplicating literal attack strings in multiple files.

## Impact vs cost

| Change | Est. effort | Signal | Flake risk |
| --- | --- | --- | --- |
| Scenario harness + author tests | Low | High — central classification rules | None |
| CORS / OAuth malformed body | Low | Medium — server boundary | None |
| Hostile GraphQL fetch tests | Low | High — validates real adapter path | None |
| Playwright security expansion | Low | High — CI gate for UX security stories | None (no live browser/network) |

## Test files touched

- `src/lib/test-harness/security-scenarios.ts` (new)
- `src/lib/validation/author-classification.test.ts` (new)
- `tests/harness/security-playwright.ts` (new)
- `tests/security.spec.ts` (expanded)
- `src/lib/token-handler.test.ts` (CORS)
- `src/lib/auth/oauth.test.ts` (malformed body)
- `src/lib/github.test.ts` (hostile GraphQL)

## Validation commands

```bash
npm run test:unit
npm run test:ux
npm run build
```

All must pass before merge.
