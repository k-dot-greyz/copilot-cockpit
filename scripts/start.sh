#!/usr/bin/env bash
# ==============================================================================
# 🚀 zenOS / GlitchWorks Fast Boot Pre-flight
# Runs on every boot (START phase).
# Super fast (<200ms), zero token sink, ensures PATH & runs silent health gate.
# ==============================================================================
set -euo pipefail

export PATH="${HOME}/.local/bin:${PATH}"

# Run silent health check if env-doctor is present
if command -v env-doctor >/dev/null 2>&1; then
  env-doctor -q || true
fi
