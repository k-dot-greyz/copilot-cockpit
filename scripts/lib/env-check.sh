#!/usr/bin/env bash
# MOD-ENV-SECURE — secure environment validation
# Usage: ./scripts/lib/env-check.sh [--non-interactive]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
NON_INTERACTIVE=false

for arg in "$@"; do
  case "$arg" in
    --non-interactive) NON_INTERACTIVE=true ;;
  esac
done

log() { echo "[env-check] $*"; }
fail() { echo "[env-check] ERROR: $*" >&2; exit 1; }

# Node engine check
REQUIRED_NODE="22.12.0"
if ! command -v node >/dev/null 2>&1; then
  fail "node not found. Install Node >= ${REQUIRED_NODE}"
fi

NODE_VER="$(node -p "process.versions.node")"
# Stub: full semver compare in MOD-ENV-SECURE implementation
log "node ${NODE_VER} (required >= ${REQUIRED_NODE})"

# .env must not be tracked
if [[ -f "${ROOT}/.env" ]] && git -C "${ROOT}" ls-files --error-unmatch .env >/dev/null 2>&1; then
  fail ".env is tracked by git — remove it from the index"
fi

# Secret pattern scan on staged files (stub — expand in MOD-ENV-SECURE)
if git -C "${ROOT}" rev-parse --git-dir >/dev/null 2>&1; then
  STAGED="$(git -C "${ROOT}" diff --cached --name-only 2>/dev/null || true)"
  if echo "${STAGED}" | grep -qE '\.(env|pem|key)$'; then
    fail "Secret-like file staged for commit"
  fi
fi

# .env.example must exist
[[ -f "${ROOT}/.env.example" ]] || fail ".env.example missing — add template before quickstart"

if ! grep -q "COCKPIT_" "${ROOT}/.env.example" 2>/dev/null; then
  log "WARN: .env.example has no COCKPIT_ vars yet (stub)"
fi

log "env-check passed"
exit 0
