#!/usr/bin/env bash
# Prints the Card Core digest of a JSON file: sha256: + hex SHA-256 of the canonical JSON.
# Canonical = UTF-8, keys sorted, no whitespace, integers only (see SPEC.md section 9).
# Needs only jq and sha256sum, so it is independent of the reference implementation.
# Usage: digest.sh FILE   (or pipe JSON on stdin)
set -euo pipefail
src="${1:--}"
printf 'sha256:%s\n' "$(jq -cSj . "$src" | sha256sum | cut -d' ' -f1)"
