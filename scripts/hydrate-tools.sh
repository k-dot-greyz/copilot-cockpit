#!/usr/bin/env bash
# Unified Dev Tooling Hydrator — INSTALL phase for copilot-cockpit / zenOS.
# Vendors env-doctor from submodule, syncs optional zen-tools, prints sitrep.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS_DIR="${HOME}/.local/share/zen-tools"
BIN_DIR="${HOME}/.local/bin"
mkdir -p "${TOOLS_DIR}" "${BIN_DIR}"
[[ ":$PATH:" != *":${BIN_DIR}:"* ]] && export PATH="${BIN_DIR}:${PATH}"

echo "⚡ [Hydrate] Bootstrapping copilot-cockpit environment..."

# 1. Init vendored env-doctor submodule
if [[ -f "${REPO_ROOT}/.gitmodules" ]]; then
  git -C "${REPO_ROOT}" submodule update --init --recursive vendor/env-doctor 2>/dev/null || true
fi

# 2. Symlink vendored env-doctor (preferred over remote clone)
if [[ -f "${REPO_ROOT}/vendor/env-doctor/env-doctor.sh" ]]; then
  chmod +x "${REPO_ROOT}/vendor/env-doctor/env-doctor.sh"
  ln -sfn "${REPO_ROOT}/vendor/env-doctor/env-doctor.sh" "${BIN_DIR}/env-doctor"
  echo "✓ [Hydrate] env-doctor shim → vendor/env-doctor"
fi

# 3. Optional zen-tools ecosystem (nightly/head)
OPTIONAL_REPOS=(
  "k-dot-greyz/git-butler"
  "k-dot-greyz/neuro-spicy-devkit"
  "k-dot-greyz/dinit"
)

sync_repo() {
  local repo="$1"
  local name="${repo##*/}"
  local dest="${TOOLS_DIR}/${name}"

  if [[ ! -d "${dest}/.git" ]]; then
    gh repo clone "${repo}" "${dest}" -- --depth 1 --quiet 2>/dev/null || \
    git clone "https://github.com/${repo}.git" "${dest}" --depth 1 --quiet 2>/dev/null || true
  else
    git -C "${dest}" pull --quiet --ff-only 2>/dev/null || true
  fi
}

for repo in "${OPTIONAL_REPOS[@]}"; do
  sync_repo "$repo" &
done
wait

if [[ -f "${TOOLS_DIR}/git-butler/scripts/guided-pr-flow.sh" ]]; then
  chmod +x "${TOOLS_DIR}/git-butler/scripts/guided-pr-flow.sh"
  ln -sfn "${TOOLS_DIR}/git-butler/scripts/guided-pr-flow.sh" "${BIN_DIR}/git-steward"
  ln -sfn "${TOOLS_DIR}/git-butler/scripts/guided-pr-flow.sh" "${BIN_DIR}/git-butler"
fi

if [[ -f "${TOOLS_DIR}/neuro-spicy-devkit/init.sh" ]]; then
  chmod +x "${TOOLS_DIR}/neuro-spicy-devkit/init.sh"
  ln -sfn "${TOOLS_DIR}/neuro-spicy-devkit/init.sh" "${BIN_DIR}/neuro-spicy"
fi

if [[ -f "${TOOLS_DIR}/dinit/dinit.sh" ]]; then
  chmod +x "${TOOLS_DIR}/dinit/dinit.sh"
  ln -sfn "${TOOLS_DIR}/dinit/dinit.sh" "${BIN_DIR}/dinit"
fi

# 4. Python 3.14+ gate (before any Python script in this repo)
export ENV_DOCTOR_ASSUME_YES=true
export REPO_ROOT
bash "${REPO_ROOT}/scripts/ensure-python314.sh" || {
  echo "⚠ [Hydrate] Python 3.14 not yet available — env-doctor tier-2 init will retry on start" >&2
}

# 5. npm deps at current lockfile
if [[ -f "${REPO_ROOT}/package-lock.json" ]]; then
  (cd "${REPO_ROOT}" && npm ci --no-audit --no-fund)
else
  (cd "${REPO_ROOT}" && npm install --no-audit --no-fund)
fi

# 6. Sitrep matrix
get_node_ver() { node --version 2>/dev/null || echo "missing"; }
get_npm_ver() { npm --version 2>/dev/null || echo "missing"; }
get_py_ver() {
  if command -v python3.14 &>/dev/null; then python3.14 --version 2>/dev/null
  elif command -v python3 &>/dev/null; then python3 --version 2>/dev/null
  else echo "missing"; fi
}
get_pkg_ver() {
  node -p "require('${REPO_ROOT}/node_modules/${1}/package.json').version" 2>/dev/null || echo "missing"
}

echo ""
echo "┌── copilot-cockpit Dep & Tooling Sitrep ─────────────────────"
printf "  %-18s %-32s [%s]\n" "Node.js" "$(get_node_ver)" "release stable"
printf "  %-18s %-32s [%s]\n" "npm" "$(get_npm_ver)" "release stable"
printf "  %-18s %-32s [%s]\n" "Python" "$(get_py_ver)" "3.14+ required"
printf "  %-18s %-32s [%s]\n" "astro" "$(get_pkg_ver astro)" "current"
printf "  %-18s %-32s [%s]\n" "vitest" "$(get_pkg_ver vitest)" "current"
if [[ -d "${REPO_ROOT}/vendor/env-doctor/.git" ]]; then
  sha=$(git -C "${REPO_ROOT}/vendor/env-doctor" rev-parse --short HEAD 2>/dev/null || echo "unknown")
  printf "  %-18s %-32s [%s]\n" "env-doctor" "rev ${sha}" "vendored"
fi
echo "└─────────────────────────────────────────────────────────────"
