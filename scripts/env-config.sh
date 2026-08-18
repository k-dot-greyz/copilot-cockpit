#!/usr/bin/env bash
# env-config.sh — Install login/boot hooks and Python guard for copilot-cockpit.
# Adapted from k-dot-greyz/env-doctor with cockpit-specific Python 3.14 gate.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${ENV_DOCTOR_REPO:-$(cd "$SCRIPT_DIR/.." && pwd)}"
ENV_DOCTOR="${REPO_ROOT}/vendor/env-doctor/env-doctor.sh"
ENSURE_PY="${REPO_ROOT}/scripts/ensure-python314.sh"

PROFILE_MARKER_START="# >>> copilot-cockpit env-config >>>"
PROFILE_MARKER_END="# <<< copilot-cockpit env-config <<<"
PYTHON_GUARD_START="# >>> copilot-cockpit python314 guard >>>"
PYTHON_GUARD_END="# <<< copilot-cockpit python314 guard <<<"

_usage() {
  cat <<EOF
Usage: ENV_DOCTOR_REPO=/path/to/repo bash scripts/env-config.sh <install|uninstall|check>
EOF
}

_install_python_guard() {
  local target block
  block="${PYTHON_GUARD_START}
# Reject Python < 3.14 before any script runs (managed by copilot-cockpit)
_cockpit_python_guard() {
  local _ver _maj _min
  command -v python3 &>/dev/null || return 0
  _ver=\$(python3 --version 2>&1 | awk '{print \$2}')
  _maj=\$(echo \"\$_ver\" | cut -d. -f1)
  _min=\$(echo \"\$_ver\" | cut -d. -f2)
  if [[ \"\$_maj\" -lt 3 ]] || [[ \"\$_min\" -lt 14 ]]; then
    if command -v python3.14 &>/dev/null; then
      alias python3=python3.14
      alias python=python3.14
    else
      echo \"[cockpit] Python 3.14+ required (found \$_ver). Run: bash scripts/ensure-python314.sh\" >&2
      return 1
    fi
  fi
}
_cockpit_python_guard || true
${PYTHON_GUARD_END}"

  for target in "$HOME/.bashrc" "$HOME/.zshrc"; do
    [[ -f "$target" ]] || continue
    if grep -qF "$PYTHON_GUARD_START" "$target" 2>/dev/null; then
      echo "  python guard already in $(basename "$target")"
      continue
    fi
    printf '\n%s\n' "$block" >>"$target"
    echo "  installed python314 guard in $(basename "$target")"
  done
}

_install_boot_audit() {
  if [[ -x "$ENV_DOCTOR" ]]; then
    ENV_DOCTOR_REPO="$REPO_ROOT" bash "${REPO_ROOT}/vendor/env-doctor/scripts/env-config.sh" install
  fi
}

_install() {
  [[ -x "$ENSURE_PY" ]] || chmod +x "$ENSURE_PY"
  ENV_DOCTOR_ASSUME_YES=true REPO_ROOT="$REPO_ROOT" bash "$ENSURE_PY" || {
    echo "env-config: Python 3.14 bootstrap failed" >&2
    exit 1
  }
  _install_python_guard
  _install_boot_audit
  echo "env-config: install complete"
}

_uninstall() {
  local target tmp
  for target in "$HOME/.bashrc" "$HOME/.zshrc"; do
    [[ -f "$target" ]] || continue
    for marker_start in "$PROFILE_MARKER_START" "$PYTHON_GUARD_START" "# >>> env-doctor boot audit >>>"; do
      local marker_end
      case "$marker_start" in
        "$PROFILE_MARKER_START") marker_end="$PROFILE_MARKER_END" ;;
        "$PYTHON_GUARD_START") marker_end="$PYTHON_GUARD_END" ;;
        *) marker_end="# <<< env-doctor boot audit <<<" ;;
      esac
      grep -qF "$marker_start" "$target" 2>/dev/null || continue
      tmp="$(mktemp)"
      awk -v start="$marker_start" -v end="$marker_end" '
        $0 == start { skip=1; next }
        $0 == end { skip=0; next }
        !skip { print }
      ' "$target" >"$tmp"
      cat "$tmp" >"$target"
      rm -f "$tmp"
    done
  done
  if [[ -x "${REPO_ROOT}/vendor/env-doctor/scripts/env-config.sh" ]]; then
    ENV_DOCTOR_REPO="$REPO_ROOT" bash "${REPO_ROOT}/vendor/env-doctor/scripts/env-config.sh" uninstall || true
  fi
}

_check() {
  REPO_ROOT="$REPO_ROOT" bash "$ENSURE_PY"
  if [[ -x "$ENV_DOCTOR" ]]; then
    ENV_DOCTOR_REPO="$REPO_ROOT" bash "$ENV_DOCTOR" -q
  fi
}

cmd="${1:-}"
case "$cmd" in
  install) _install ;;
  uninstall) _uninstall ;;
  check) _check ;;
  *) _usage; exit 1 ;;
esac
