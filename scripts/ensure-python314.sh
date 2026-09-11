#!/usr/bin/env bash
# ensure-python314.sh — Block Python < 3.14 and install 3.14+ before any Python script runs.
# Sourced by start.sh, package.json preflight hooks, and python-guard wrappers.
set -euo pipefail

MIN_MINOR="${ENV_DOCTOR_MIN_PYTHON_MINOR:-14}"
REQUIRED_PIN="${ENV_DOCTOR_PYTHON_PIN:-3.${MIN_MINOR}}"
AUTO_INSTALL="${ENV_DOCTOR_ASSUME_YES:-false}"

_python_version() {
  local bin="$1"
  "$bin" --version 2>&1 | awk '{print $2}'
}

_python_meets_minimum() {
  local ver="$1" major minor
  major="$(echo "$ver" | cut -d. -f1)"
  minor="$(echo "$ver" | cut -d. -f2)"
  [[ "$major" -ge 3 ]] && [[ "$minor" -ge "$MIN_MINOR" ]]
}

_find_best_python() {
  local py ver
  for py in python3.14 python3.15 python3; do
    command -v "$py" &>/dev/null || continue
    ver="$(_python_version "$py")"
    if _python_meets_minimum "$ver"; then
      printf '%s\n' "$py"
      return 0
    fi
  done
  return 1
}

_install_python314() {
  if command -v python3.14 &>/dev/null; then
    return 0
  fi

  if [[ "$AUTO_INSTALL" != "true" ]]; then
    echo "ensure-python314: Python 3.${MIN_MINOR}+ required (found older or missing)." >&2
    echo "  Set ENV_DOCTOR_ASSUME_YES=true or run: bash vendor/env-doctor/env-doctor.sh --init --tier 2 --yes" >&2
    return 1
  fi

  if [[ -x "${REPO_ROOT:-}/vendor/env-doctor/env-doctor.sh" ]]; then
    ENV_DOCTOR_ASSUME_YES=true bash "${REPO_ROOT}/vendor/env-doctor/env-doctor.sh" --init --tier 2 --yes --quiet || true
  fi

  if ! command -v uv &>/dev/null; then
    curl -LsSf https://astral.sh/uv/install.sh | sh 2>/dev/null || true
    export PATH="${HOME}/.local/bin:${PATH}"
  fi

  if command -v uv &>/dev/null; then
    uv python install "${REQUIRED_PIN}" 2>/dev/null || true
  fi

  command -v python3.14 &>/dev/null
}

ensure_python314() {
  local best py_bin

  REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
  export REPO_ROOT

  if best="$(_find_best_python)"; then
    export PYTHON_BIN="$best"
    export PYTHON="${PYTHON_BIN}"
    # Reject stale system python3 symlinks below minimum
    if command -v python3 &>/dev/null; then
      local sys_ver
      sys_ver="$(_python_version python3)"
      if ! _python_meets_minimum "$sys_ver"; then
        export PYTHON3_GUARDED=1
      fi
    fi
    return 0
  fi

  _install_python314 || return 1
  best="$(_find_best_python)" || return 1
  export PYTHON_BIN="$best"
  export PYTHON="${PYTHON_BIN}"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  ensure_python314
  echo "Python OK: ${PYTHON_BIN} ($(_python_version "${PYTHON_BIN}"))"
fi
