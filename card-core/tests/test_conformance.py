"""pytest wrapper around the conformance harness.

Every row of the suite is its own test, so a failure names the exact rule. The
same suite is the contract for any other implementation (see SPEC.md section 11).
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
import run_conformance as rc  # noqa: E402

ROWS, PROBLEMS = rc.load_rows(ROOT)
LIMITS = rc.load_limits(ROOT)
IMPL = rc.InProcessImpl(ROOT)


def test_suite_is_consistent():
    assert PROBLEMS == []


def test_suite_is_not_empty():
    assert len(ROWS) > 300
    assert {r.op for r in ROWS} == rc.OPS


@pytest.mark.parametrize("row", ROWS, ids=[r.id for r in ROWS])
def test_row(row):
    passed, message = rc.check_row(row, IMPL, ROOT, LIMITS)
    assert passed, message


def test_selftest_catches_every_canary(capsys):
    assert rc.selftest(ROOT, ROWS, LIMITS), capsys.readouterr().out


@pytest.mark.skipif(shutil.which("jq") is None, reason="jq not installed")
def test_digest_parity_between_python_and_jq():
    goldens = sorted((ROOT / "conformance" / "golden").glob("*.json"))
    assert goldens
    for golden in goldens:
        via_jq = subprocess.check_output(["bash", str(ROOT / "tools" / "digest.sh"), str(golden)], text=True).strip()
        assert via_jq == rc.digest(rc.load_json(golden)), golden.name


def _patterns(node):
    if isinstance(node, dict):
        for key, val in node.items():
            if key == "pattern" and isinstance(val, str):
                yield val
            else:
                yield from _patterns(val)
    elif isinstance(node, list):
        for val in node:
            yield from _patterns(val)


def _forbidden(pattern: str) -> list[str]:
    """Constructs SPEC.md section 4.1 forbids: `.`, \\d \\w \\s, lookarounds, backreferences, flags."""
    found, in_class, i = [], False, 0
    while i < len(pattern):
        ch = pattern[i]
        if ch == "\\":
            nxt = pattern[i + 1 : i + 2]
            if nxt and (nxt in "dDwWsSbB" or nxt.isdigit()):
                found.append("\\" + nxt)
            i += 2
            continue
        if in_class:
            in_class = ch != "]"
        elif ch == "[":
            in_class = True
        elif ch == ".":
            found.append(".")
        elif pattern.startswith("(?", i):
            found.append("(?")
        i += 1
    return found


def test_schema_patterns_stay_in_the_spec_subset():
    """Regex dialects disagree on these constructs, so a schema that used one would be a schema bug."""
    schemas = sorted((ROOT / "schemas").rglob("*.json")) + sorted((ROOT / "conformance" / "schemas").rglob("*.json"))
    assert schemas
    seen = 0
    for path in schemas:
        for pattern in _patterns(rc.load_json(path)):
            seen += 1
            assert _forbidden(pattern) == [], f"{path.name}: {pattern!r} uses {_forbidden(pattern)}"
    assert seen > 10


def test_external_protocol_matches_in_process():
    """A sample of every op through the stdin/stdout protocol gives the same verdicts."""
    external = rc.CommandImpl(ROOT, f"{sys.executable} {ROOT / 'tools' / 'ref_cli.py'}")
    sample = []
    for op in sorted(rc.OPS):
        sample.extend([r for r in ROWS if r.op == op][:6])
    for row in sample:
        passed, message = rc.check_row(row, external, ROOT, LIMITS)
        assert passed, f"{row.id}: {message}"
