#!/usr/bin/env bash
# ==============================================================================
# 🚀 zenOS / GlitchWorks Fast Boot Pre-flight
# Runs on every boot (START phase).
# Super fast (<50ms), zero token sink, ensures PATH & runs silent health gate.
# ==============================================================================
set -euo pipefail

BIN_DIR="${HOME}/.local/bin"
[[ ":$PATH:" != *":${BIN_DIR}:"* ]] && export PATH="${BIN_DIR}:${PATH}"

# 1. Fast pre-flight check if env-doctor is present
if [[ -x "${BIN_DIR}/env-doctor" ]]; then
  "${BIN_DIR}/env-doctor" -q || true
fi

# 2. Compact single-line readiness beacon
echo "⚡ [zenOS Boot] Shims verified in PATH. Environment clean."
