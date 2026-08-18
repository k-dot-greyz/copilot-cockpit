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
[[ ":$PATH:" != *":${BIN_DIR}:"* ]] && export PATH="${BIN_DIR}:${PATH}"

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
get_node_ver() { node --version 2>/dev/null || echo "missing"; }
get_npm_ver() { npm --version 2>/dev/null || echo "missing"; }
get_git_ver() { git --version 2>/dev/null || echo "missing"; }
get_gh_ver() { gh --version 2>/dev/null | head -n 1 || echo "missing"; }
get_py_ver() { python3 --version 2>/dev/null || echo "missing"; }

get_repo_info() {
  local dir="${TOOLS_DIR}/$1"
  if [[ -d "${dir}/.git" ]]; then
    local sha date
    sha=$(git -C "${dir}" rev-parse --short HEAD 2>/dev/null || echo "unknown")
    date=$(git -C "${dir}" log -1 --format=%cd --date=format:'%Y-%m-%d' 2>/dev/null || echo "")
    printf "rev %-12s (%s)  [nightly/head]" "$sha" "$date"
  else
    printf "missing                [unavailable]"
  fi
}

echo ""
echo "┌── zenOS Dep & Tooling Sitrep ───────────────────────────────"
printf "  %-18s %-32s [%s]\n" "Node.js" "$(get_node_ver)" "release stable"
printf "  %-18s %-32s [%s]\n" "npm" "$(get_npm_ver)" "release stable"
printf "  %-18s %-32s [%s]\n" "Git" "$(get_git_ver)" "release stable"
printf "  %-18s %-32s [%s]\n" "GitHub CLI" "$(get_gh_ver)" "release stable"
printf "  %-18s %-32s [%s]\n" "Python" "$(get_py_ver)" "release stable"
echo "├─────────────────────────────────────────────────────────────"
printf "  %-18s %s\n" "env-doctor" "$(get_repo_info "env-doctor")"
printf "  %-18s %s\n" "git-butler" "$(get_repo_info "git-butler")"
printf "  %-18s %s\n" "neuro-spicy-devkit" "$(get_repo_info "neuro-spicy-devkit")"
printf "  %-18s %s\n" "dinit" "$(get_repo_info "dinit")"
echo "└─────────────────────────────────────────────────────────────"
echo ""
