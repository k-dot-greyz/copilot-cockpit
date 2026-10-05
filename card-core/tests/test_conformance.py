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


def test_external_protocol_matches_in_process():
    """A sample of every op through the stdin/stdout protocol gives the same verdicts."""
    external = rc.CommandImpl(ROOT, f"{sys.executable} {ROOT / 'tools' / 'ref_cli.py'}")
    sample = []
    for op in sorted(rc.OPS):
        sample.extend([r for r in ROWS if r.op == op][:6])
    for row in sample:
        passed, message = rc.check_row(row, external, ROOT, LIMITS)
        assert passed, f"{row.id}: {message}"
