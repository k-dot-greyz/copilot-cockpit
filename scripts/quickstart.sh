#!/usr/bin/env bash
# MOD-QUICKSTART-ORGANIC — interactive dev bootstrap for human developers
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

echo "🚀 Copilot Cockpit — organic quickstart"
echo ""

# 1. Secure env check
bash "${ROOT}/scripts/lib/env-check.sh"

# 2. .env bootstrap
if [[ ! -f "${ROOT}/.env" ]]; then
  cp "${ROOT}/.env.example" "${ROOT}/.env"
  echo "Created .env from .env.example — edit local overrides (never commit)"
else
  echo ".env exists — skipping copy"
fi

# 3. Install
if [[ -f "${ROOT}/package-lock.json" ]]; then
  npm ci
else
  npm install
fi

# 4. Smoke test
npm run test

echo ""
echo "✅ Quickstart complete"
echo "   npm run dev     → start Astro dev server"
echo "   npm run test:ux → Playwright (after MOD-PLAYWRIGHT-CONFIG)"
echo ""
echo "PAT: enter via dashboard UI (sessionStorage). Never commit tokens."
