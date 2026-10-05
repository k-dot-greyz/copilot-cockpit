#!/usr/bin/env bash
# Toolchain bootstrap for cloud sessions. Idempotent: every step checks before it acts.
# Pins are the stables verified on 2026-10-05. Bump the pins below to upgrade.
#
# Hosts this needs: nodejs.org, registry.npmjs.org, static.rust-lang.org,
#                   releases.nixos.org, cache.nixos.org, pypi.org, files.pythonhosted.org
#
# Test it without touching the live env:
#   TC_OPT=/tmp/tc/opt TC_BIN=/tmp/tc/bin TC_SKIP_RUST=1 UV_TOOL_DIR=/tmp/tc/uvtools bash setup-toolchain.sh
set -euo pipefail

OPT="${TC_OPT:-/opt}"
BIN="${TC_BIN:-/root/.local/bin}"

NODE_VER=26.10.0
NPM_VER=12.2.0
PNPM_VER=12.9.1
TS_VER=7.0.2
ESLINT_VER=10.12.0
PRETTIER_VER=3.9.9
UV_VER=0.12.23
PY_VER=3.14.7
# Pinned nixpkgs snapshot that ships CPython $PY_VER (python.org is not reachable from cloud sessions)
NIXPKGS_URL="https://releases.nixos.org/nixos/unstable/nixos-26.11pre1085777.494ce7fd23ff/nixexprs.tar.xz"
# Installed once from public PyPI onto $PY_VER (uv tool receipts may point at a stale internal mirror)
UV_TOOLS="black flake8 mypy poetry pyright ruff"

log() { printf '[toolchain] %s\n' "$*"; }
mkdir -p "$OPT" "$BIN" "$OPT/venvs"
export UV_PYTHON_DOWNLOADS=never
export UV_TOOL_BIN_DIR="$BIN"

# ---- Node + global CLIs -------------------------------------------------------
NODE_DIR="$OPT/node26"
if [ "$("$NODE_DIR/bin/node" -v 2>/dev/null || true)" != "v$NODE_VER" ]; then
  log "node $NODE_VER: installing"
  tmp="$(mktemp -d)"
  f="node-v$NODE_VER-linux-x64.tar.xz"
  curl -fsS --max-time 300 -o "$tmp/$f" "https://nodejs.org/dist/v$NODE_VER/$f"
  curl -fsS --max-time 60 -o "$tmp/SHASUMS256.txt" "https://nodejs.org/dist/v$NODE_VER/SHASUMS256.txt"
  (cd "$tmp" && grep " $f\$" SHASUMS256.txt | sha256sum -c -)
  stage="$(mktemp -d -p "$OPT")"
  tar -xJf "$tmp/$f" -C "$stage" --strip-components=1
  if [ -e "$NODE_DIR" ]; then mv "$NODE_DIR" "$NODE_DIR.old.$$"; fi
  mv "$stage" "$NODE_DIR"
else
  log "node $NODE_VER: ok"
fi
export PATH="$NODE_DIR/bin:$PATH"

pkgs=()
[ "$(npm -v)" = "$NPM_VER" ] || pkgs+=("npm@$NPM_VER")
for spec in "pnpm@$PNPM_VER" "typescript@$TS_VER" "eslint@$ESLINT_VER" "prettier@$PRETTIER_VER"; do
  name="${spec%@*}"
  ver="${spec##*@}"
  have="$(node -p "try{require('$NODE_DIR/lib/node_modules/$name/package.json').version}catch(e){''}")"
  [ "$have" = "$ver" ] || pkgs+=("$spec")
done
if [ "${#pkgs[@]}" -gt 0 ]; then
  log "npm -g: ${pkgs[*]}"
  npm install -g "${pkgs[@]}"
else
  log "npm globals: ok"
fi
# tsserver is intentionally not linked: TypeScript 7 does not ship that binary.
for b in node npm npx pnpm pnpx pn pnx tsc eslint prettier; do
  ln -sfn "$NODE_DIR/bin/$b" "$BIN/$b"
done

# ---- Rust ---------------------------------------------------------------------
if [ "${TC_SKIP_RUST:-0}" != "1" ]; then
  if command -v rustup >/dev/null 2>&1; then
    log "rust: rustup update stable"
    rustup update stable
  else
    log "rust: rustup not found, skipping"
  fi
fi

# ---- Python 3.14 (via pinned nixpkgs) ----------------------------------------
PY_DIR="$OPT/python314"
if [ "$("$PY_DIR/bin/python3.14" -c 'import platform; print(platform.python_version())' 2>/dev/null || true)" != "$PY_VER" ]; then
  log "python $PY_VER: nix-build from pinned nixpkgs"
  nix-build "$NIXPKGS_URL" -A python314 -o "$PY_DIR"
else
  log "python $PY_VER: ok"
fi
ln -sfn "$PY_DIR/bin/python3.14" "$BIN/python3.14"
# python3 is deliberately left on the system interpreter (gcloud, bq and gsutil depend on it).

# ---- uv -----------------------------------------------------------------------
TOOLS_VENV="$OPT/venvs/tools"
if [ "$("$TOOLS_VENV/bin/uv" --version 2>/dev/null | cut -d' ' -f2 || true)" != "$UV_VER" ]; then
  log "uv $UV_VER: installing"
  [ -x "$TOOLS_VENV/bin/python" ] || "$PY_DIR/bin/python3.14" -m venv "$TOOLS_VENV"
  "$TOOLS_VENV/bin/python" -m pip install --quiet --upgrade pip "uv==$UV_VER"
else
  log "uv $UV_VER: ok"
fi
for b in uv uvx; do
  if [ -e "$BIN/$b" ] && [ ! -L "$BIN/$b" ]; then mv "$BIN/$b" "$BIN/$b.bak"; fi
  ln -sfn "$TOOLS_VENV/bin/$b" "$BIN/$b"
done

# ---- Python env for card-core tooling ----------------------------------------
VENV="$OPT/venvs/py314"
[ -x "$VENV/bin/python" ] || "$BIN/uv" venv "$VENV" --python "$PY_DIR/bin/python3.14" --seed
"$BIN/uv" pip install --quiet --python "$VENV/bin/python" --default-index https://pypi.org/simple jsonschema pytest

# ---- uv-managed dev tools -----------------------------------------------------
for t in $UV_TOOLS; do
  if "$BIN/uv" tool list 2>/dev/null | grep -q "^$t "; then
    log "uv tool $t: ok"
  else
    log "uv tool $t: installing"
    "$BIN/uv" tool install --python "$PY_DIR/bin/python3.14" --default-index https://pypi.org/simple "$t"
  fi
done

# ---- report -------------------------------------------------------------------
log "versions:"
printf '  node %s | npm %s | pnpm %s | tsc %s\n' "$(node -v)" "$(npm -v)" "$(pnpm -v)" "$(tsc --version | cut -d' ' -f2)"
printf '  python3.14 %s | uv %s | jsonschema %s\n' \
  "$("$PY_DIR/bin/python3.14" -c 'import platform; print(platform.python_version())')" \
  "$("$BIN/uv" --version | cut -d' ' -f2)" \
  "$("$VENV/bin/python" -c 'from importlib.metadata import version; print(version("jsonschema"))')"
if command -v rustc >/dev/null 2>&1; then printf '  %s\n' "$(rustc --version)"; fi
