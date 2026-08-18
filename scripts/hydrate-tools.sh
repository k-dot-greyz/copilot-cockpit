#!/usr/bin/env bash
# ==============================================================================
# 🚀 zenOS / GlitchWorks Unified Dev Tooling Hydrator
# Runs during the INSTALL phase to pull & shim:
#   - env-doctor
#   - git-butler (guided-pr-flow)
#   - neuro-spicy-devkit
#   - dinit
# Headless, parallel, non-interactive, zero token waste on subsequent boots.
# ==============================================================================
set -euo pipefail

TOOLS_DIR="${HOME}/.local/share/zen-tools"
BIN_DIR="${HOME}/.local/bin"
mkdir -p "${TOOLS_DIR}" "${BIN_DIR}"

REPOS=(
  "k-dot-greyz/env-doctor"
  "k-dot-greyz/git-butler"
  "k-dot-greyz/neuro-spicy-devkit"
  "k-dot-greyz/dinit"
)

echo "⚡ [Hydrate] Syncing zen-tools ecosystem to ${TOOLS_DIR}..."

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

for repo in "${REPOS[@]}"; do
  sync_repo "$repo" &
done
wait

# ------------------------------------------------------------------------------
# Create executable symlinks in ~/.local/bin
# ------------------------------------------------------------------------------
if [[ -f "${TOOLS_DIR}/env-doctor/env-doctor.sh" ]]; then
  chmod +x "${TOOLS_DIR}/env-doctor/env-doctor.sh"
  ln -sfn "${TOOLS_DIR}/env-doctor/env-doctor.sh" "${BIN_DIR}/env-doctor"
fi

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

echo "✓ [Hydrate] Tool shims installed in ${BIN_DIR}"
