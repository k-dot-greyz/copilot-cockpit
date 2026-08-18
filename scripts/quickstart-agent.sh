#!/usr/bin/env bash
# MOD-QUICKSTART-AGENTIC — non-interactive bootstrap for cloud agents / CI
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

echo "[quickstart-agent] Copilot Cockpit — agentic bootstrap"

# 1. Secure env check (no prompts)
bash "${ROOT}/scripts/lib/env-check.sh" --non-interactive

# 2. Never create .env in agent mode — use injected env only
if [[ -f "${ROOT}/.env" ]]; then
  echo "[quickstart-agent] .env present (local only — not read for secrets log)"
fi

# 3. Install (prefer lockfile)
if [[ -f "${ROOT}/package-lock.json" ]]; then
  npm ci --prefer-offline --no-audit --no-fund 2>/dev/null || npm ci
else
  npm install --no-audit --no-fund
fi

# 4. Smoke test
npm run test

# 5. Optional API smoke (only if token injected — never echo)
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  echo "[quickstart-agent] GITHUB_TOKEN set — API smoke skipped in stub (implement in MOD-QUICKSTART-AGENTIC)"
fi

echo "[quickstart-agent] done exit=0"
