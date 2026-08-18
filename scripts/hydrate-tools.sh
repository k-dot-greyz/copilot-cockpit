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
export PATH="${BIN_DIR}:${PATH}"

REPOS=(
  "k-dot-greyz/env-doctor"
  "k-dot-greyz/git-butler"
  "k-dot-greyz/neuro-spicy-devkit"
  "k-dot-greyz/dinit"
)

echo "⚡ [Hydrate] Syncing zen-tools ecosystem in parallel to ${TOOLS_DIR}..."

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

# ------------------------------------------------------------------------------
# Pinged dependency & tool sitrep matrix
# ------------------------------------------------------------------------------
format_tool_version() {
  local name="$1"
  local cmd="$2"
  local ver="missing"
  local channel="release stable"

  if command -v "${cmd%% *}" >/dev/null 2>&1; then
    ver=$(eval "$cmd" 2>&1 | head -n 1 || echo "unknown")
    printf "  %-18s %-32s [%s]\n" "$name" "$ver" "$channel"
  else
    printf "  %-18s %-32s [not installed]\n" "$name" "$ver"
  fi
}

format_repo_version() {
  local name="$1"
  local dir="${TOOLS_DIR}/$1"
  if [[ -d "${dir}/.git" ]]; then
    local sha
    local date
    sha=$(git -C "${dir}" rev-parse --short HEAD 2>/dev/null || echo "unknown")
    date=$(git -C "${dir}" log -1 --format=%cd --date=format:'%Y-%m-%d' 2>/dev/null || echo "")
    printf "  %-18s rev %-12s (%s)  [nightly/head]\n" "$name" "$sha" "$date"
  else
    printf "  %-18s missing                [unavailable]\n" "$name"
  fi
}

echo ""
echo "┌── zenOS Dep & Tooling Sitrep ───────────────────────────────"
format_tool_version "Node.js" "node --version"
format_tool_version "npm" "npm --version"
format_tool_version "Git" "git --version"
format_tool_version "GitHub CLI" "gh --version | head -1"
format_tool_version "Python" "python3 --version"
echo "├─────────────────────────────────────────────────────────────"
format_repo_version "env-doctor"
format_repo_version "git-butler"
format_repo_version "neuro-spicy-devkit"
format_repo_version "dinit"
echo "└─────────────────────────────────────────────────────────────"
echo ""
