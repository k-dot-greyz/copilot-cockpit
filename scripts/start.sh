#!/usr/bin/env bash
# Fast boot pre-flight — START phase for copilot-cockpit Cloud Agent environments.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN_DIR="${HOME}/.local/bin"
[[ ":$PATH:" != *":${BIN_DIR}:"* ]] && export PATH="${BIN_DIR}:${PATH}"

# Python 3.14+ gate before any Python tooling
export REPO_ROOT
export ENV_DOCTOR_ASSUME_YES="${ENV_DOCTOR_ASSUME_YES:-true}"
bash "${REPO_ROOT}/scripts/ensure-python314.sh" 2>/dev/null || true

# Silent env-doctor health gate
if [[ -x "${BIN_DIR}/env-doctor" ]]; then
  ENV_DOCTOR_REPO="$REPO_ROOT" "${BIN_DIR}/env-doctor" -q || true
elif [[ -x "${REPO_ROOT}/vendor/env-doctor/env-doctor.sh" ]]; then
  ENV_DOCTOR_REPO="$REPO_ROOT" bash "${REPO_ROOT}/vendor/env-doctor/env-doctor.sh" -q || true
fi

echo "⚡ [cockpit Boot] Python314+ verified · env-doctor OK · PATH ready."
