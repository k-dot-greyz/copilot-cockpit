# Dev DX Quickstart — Organic & Agentic

**modules:** `MOD-QUICKSTART-ORGANIC`, `MOD-QUICKSTART-AGENTIC`, `MOD-ENV-SECURE`  
**dex_id:** `0x7D:0x12:MOD-QUICKSTART-ORGANIC`

---

## Organic developer (human)

Interactive bootstrap for local development.

```bash
# From repo root
npm run quickstart
# or
./scripts/quickstart.sh
```

**What it does:**

1. Runs `scripts/lib/env-check.sh` (Node version, no leaked secrets in git index)
2. Copies `.env.example` → `.env` if missing (prompts before overwrite)
3. `npm ci` or `npm install`
4. `npm run test` smoke check
5. Prints next steps: `npm run dev`, PAT scope requirements

**Secrets:** Never written to repo. `.env` is gitignored. PAT entered via dashboard UI at runtime.

---

## Agentic developer (cloud agent / CI)

Non-interactive bootstrap — no prompts, env vars only.

```bash
npm run quickstart:agent
# or
./scripts/quickstart-agent.sh
```

**Required env vars:**

| Var | Required | Purpose |
|-----|----------|---------|
| `NODE_ENV` | No | Defaults to `development` |
| `GITHUB_TOKEN` | No* | Optional smoke test against API (*never logged) |
| `COCKPIT_OWNER` | No | Override default repo owner |
| `COCKPIT_REPO` | No | Override default repo name |

**What it does:**

1. `env-check.sh --non-interactive`
2. `npm ci --prefer-offline`
3. `npm run test`
4. Exits `0` on success, `1` with structured stderr on failure

**Agent rules:**

- Do not commit `.env`
- Do not echo `GITHUB_TOKEN`
- Use `sessionStorage` for client PAT (existing dashboard behavior)

---

## Secure env validation

`scripts/lib/env-check.sh` enforces:

- Node `>=22.12.0` (from `package.json` engines)
- `.env` not tracked by git (`git check-ignore .env`)
- No `ghp_`, `github_pat_`, or `sk-` patterns in staged files
- `.env.example` exists and contains no real secrets

---

## package.json scripts (to add in MOD-QUICKSTART-*)

```json
{
  "quickstart": "./scripts/quickstart.sh",
  "quickstart:agent": "./scripts/quickstart-agent.sh",
  "env:check": "./scripts/lib/env-check.sh"
}
```

---

## Follow-up PRs

| Issue title | Module |
|-------------|--------|
| `[MOD-ENV-SECURE] Secure env validation and .env.example` | MOD-ENV-SECURE |
| `[MOD-QUICKSTART-ORGANIC] Interactive dev bootstrap script` | MOD-QUICKSTART-ORGANIC |
| `[MOD-QUICKSTART-AGENTIC] Non-interactive agent bootstrap script` | MOD-QUICKSTART-AGENTIC |
