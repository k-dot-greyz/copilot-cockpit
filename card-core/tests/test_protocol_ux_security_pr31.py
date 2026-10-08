"""CC-PR31: protocol boundary UX/security stories for the Rust conformance target.

Feat implementation: PR #31 on copilot-cockpit (card-core Rust + expanded suite).
These tests complement the 427 parametrized conformance rows with harness-level
checks: CI contract, hostile protocol envelopes, and optional dual-impl parity
when a release `cardcore` binary is present.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from shutil import which

import pytest

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parent
sys.path.insert(0, str(ROOT / "tools"))
import run_conformance as rc  # noqa: E402

ROWS, _ = rc.load_rows(ROOT)
LIMITS = rc.load_limits(ROOT)
REF_CLI = rc.CommandImpl(ROOT, f"{sys.executable} {ROOT / 'tools' / 'ref_cli.py'}")

# 80/20 curated rows: spec clarifications and mutant-pinned rules from PR #31.
CURATED_ROW_IDS = [
    "lint/lint#huge-integer-literal",
    "lint/lint#del-in-key",
    "lint/lint#control-character-in-string",
    "resolve/basic#unset-marker-integer-one-is-not-true",
    "resolve/basic#id-mismatch-needs-a-valid-id-first",
    "validate/invalid/open-card#token-in-params-is-open-ok",
    "validate/invalid/open-card#unset-in-params-is-open-ok",
    "validate/pack-strict",
    "validate/pack#entry-id-mismatch",
]

CURATED_ROWS = [r for r in ROWS if r.id in CURATED_ROW_IDS]
assert len(CURATED_ROWS) == len(CURATED_ROW_IDS), "curated list must match suite ids"

WORKFLOW = REPO_ROOT / ".github" / "workflows" / "card-core.yml"


def _release_rust_bin() -> Path | None:
    explicit = os.environ.get("CARD_CORE_RUST_BIN")
    if explicit:
        path = Path(explicit)
        return path if path.is_file() else None
    candidate = ROOT / "rust" / "target" / "release" / "cardcore"
    return candidate if candidate.is_file() else None


def _rust_impl() -> rc.CommandImpl | None:
    bin_path = _release_rust_bin()
    if bin_path is None:
        return None
    return rc.CommandImpl(ROOT, str(bin_path) + " protocol")


def _protocol_raw(cmd: list[str], request_text: str) -> tuple[str, int, str]:
    proc = subprocess.run(
        cmd,
        input=request_text,
        capture_output=True,
        text=True,
        timeout=30,
    )
    return proc.stdout, proc.returncode, proc.stderr


def _protocol_json(cmd: list[str], request: dict) -> tuple[dict, int, str]:
    stdout, code, stderr = _protocol_raw(cmd, json.dumps(request))
    try:
        body = json.loads(stdout)
    except json.JSONDecodeError:
        body = {"ok": False, "errors": [{"code": "E_IMPL_PROTOCOL", "pointer": stdout[:200]}]}
    return body, code, stderr


@pytest.fixture(scope="session")
def rust_impl() -> rc.CommandImpl:
    """Use a pre-built release binary (Rust CI job) or opt-in local build."""
    impl = _rust_impl()
    if impl is not None:
        return impl
    if os.environ.get("CARD_CORE_BUILD_RUST") == "1" and which("cargo") is not None:
        subprocess.run(
            ["cargo", "build", "--release", "--locked"],
            cwd=ROOT / "rust",
            check=True,
            capture_output=True,
            text=True,
        )
        impl = _rust_impl()
        if impl is not None:
            return impl
    pytest.skip("release cardcore binary not present (build in card-core/rust or set CARD_CORE_RUST_BIN)")


def test_cc31_ci_rust_job_pins_release_conformance():
    """CC31-CI-01 (DX, medium): CI must exercise the Rust binary on the full suite."""
    text = WORKFLOW.read_text(encoding="utf-8")
    assert "Conformance (Rust)" in text
    assert "cargo build --release" in text
    assert "run_conformance.py --impl-cmd" in text
    assert "cardcore protocol" in text


def test_cc31_happy_ref_cli_sample_matches_in_process():
    """CC31-H-01 (high): Python protocol adapter agrees with in-process reference on a sample."""
    sample = []
    for op in sorted(rc.OPS):
        sample.extend([r for r in ROWS if r.op == op][:4])
    for row in sample:
        passed, message = rc.check_row(row, REF_CLI, ROOT, LIMITS)
        assert passed, f"{row.id}: {message}"


@pytest.mark.parametrize("row", CURATED_ROWS, ids=[r.id for r in CURATED_ROWS])
def test_cc31_happy_curated_rows_via_ref_cli(row):
    """CC31-H-02 (high): High-blast-radius PR #31 rules pass through the external protocol."""
    passed, message = rc.check_row(row, REF_CLI, ROOT, LIMITS)
    assert passed, message


def test_cc31_sec_lint_does_not_echo_file_bytes_in_response():
    """CC31-SEC-01 (critical): lint reads bytes but never returns raw file content on success.

    Attack surface: agent supplies raw_path to a readable secret file; response must stay structural.
    """
    secret = "CC31-SECRET-PAYLOAD-7f3a9c"
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tmp:
        tmp.write('{"ok": true, "note": "%s"}' % secret)
        raw_path = tmp.name
    try:
        request = {
            "op": "lint",
            "input": {"raw_path": raw_path},
            "base_dir": None,
            "registries": [str(p) for p in rc.registry_paths(ROOT)],
            "limits": LIMITS,
        }
        body, code, stderr = _protocol_json(REF_CLI.cmd, request)
        assert code == 0
        assert secret not in json.dumps(body)
        assert secret not in stderr
        assert body.get("ok") is True
    finally:
        Path(raw_path).unlink(missing_ok=True)


def test_cc31_sec_crash_path_stdout_is_json_not_traceback():
    """CC31-SEC-02 (high): registry load failures become E_IMPL_CRASH JSON, not a Python traceback on stdout."""
    request = {
        "op": "validate",
        "input": {},
        "base_dir": None,
        "registries": ["/nonexistent/card-core/schemas/index.json"],
        "limits": LIMITS,
    }
    stdout, code, stderr = _protocol_raw(REF_CLI.cmd, json.dumps(request))
    assert code == 0
    assert "Traceback" not in stdout
    body = json.loads(stdout)
    assert body["ok"] is False
    assert body["errors"][0]["code"] == "E_IMPL_CRASH"


def test_cc31_sad_ref_cli_malformed_protocol_single_line_exit_zero():
    """CC31-S-03 (high): Python ref_cli matches Rust: malformed stdin → JSON error, exit 0."""
    cmd = REF_CLI.cmd
    for bad in ["", "not json", "[]", '{"op": 1}']:
        stdout, code, stderr = _protocol_raw(cmd, bad)
        assert code == 0, bad
        assert stdout.count("\n") <= 1
        assert "Traceback" not in stdout
        body = json.loads(stdout.strip())
        assert body["ok"] is False
        assert body["errors"][0]["code"] in {"E_IMPL_PROTOCOL", "E_IMPL_CRASH"}


def test_cc31_sad_unknown_op_is_typed_not_shell_injection():
    """CC31-S-01 (high): bizarre op strings are E_OP_UNKNOWN, not interpreted by the host shell."""
    request = {
        "op": "validate; rm -rf /",
        "input": {},
        "base_dir": None,
        "registries": [str(p) for p in rc.registry_paths(ROOT)],
        "limits": LIMITS,
    }
    body, code, _ = _protocol_json(REF_CLI.cmd, request)
    assert code == 0
    assert body["ok"] is False
    assert body["errors"][0]["code"] == "E_OP_UNKNOWN"


def test_cc31_happy_rust_sample_matches_in_process(rust_impl: rc.CommandImpl):
    """CC31-H-03 (high): Release Rust binary matches reference on a per-op sample."""
    sample = []
    for op in sorted(rc.OPS):
        sample.extend([r for r in ROWS if r.op == op][:4])
    for row in sample:
        passed, message = rc.check_row(row, rust_impl, ROOT, LIMITS)
        assert passed, f"{row.id}: {message}"


@pytest.mark.parametrize("row", CURATED_ROWS, ids=[r.id for r in CURATED_ROWS])
def test_cc31_happy_curated_rows_via_rust(row, rust_impl: rc.CommandImpl):
    """CC31-H-04 (high): Curated PR #31 rows through the Rust protocol adapter."""
    passed, message = rc.check_row(row, rust_impl, ROOT, LIMITS)
    assert passed, message


def test_cc31_sad_rust_malformed_protocol_single_line_exit_zero(rust_impl: rc.CommandImpl):
    """CC31-S-02 (high): Malformed stdin still yields one JSON line and exit 0 (no panic on stderr)."""
    cmd = rust_impl.cmd
    for bad in ["", "not json", "[]", '{"op": 1}']:
        stdout, code, stderr = _protocol_raw(cmd, bad)
        assert code == 0, bad
        assert stdout.count("\n") <= 1
        assert "panic" not in stderr.lower()
        body = json.loads(stdout.strip())
        assert body["ok"] is False
        assert body["errors"][0]["code"] in {"E_IMPL_PROTOCOL", "E_IMPL_CRASH"}


def test_cc31_ablation_python_and_rust_agree_on_curated_rows(rust_impl: rc.CommandImpl):
    """CC31-A-01 (high): Dual-impl parity on curated rows — graceful ablation if either diverges."""
    for row in CURATED_ROWS:
        py = REF_CLI.run(row.op, row.input, row.base_dir, {**LIMITS, **row.limits})
        rs = rust_impl.run(row.op, row.input, row.base_dir, {**LIMITS, **row.limits})
        assert py == rs, f"{row.id}: python {py!r} rust {rs!r}"


def test_cc31_sec_rust_lint_does_not_echo_file_bytes(rust_impl: rc.CommandImpl):
    """CC31-SEC-03 (critical): Rust lint path matches the no-exfiltration contract."""
    secret = "CC31-RUST-SECRET-b4e2"
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tmp:
        tmp.write('{"x": "%s"}' % secret)
        raw_path = tmp.name
    try:
        request = {
            "op": "lint",
            "input": {"raw_path": raw_path},
            "base_dir": None,
            "registries": [str(p) for p in rc.registry_paths(ROOT)],
            "limits": LIMITS,
        }
        body, code, stderr = _protocol_json(rust_impl.cmd, request)
        assert code == 0
        assert secret not in json.dumps(body)
        assert secret not in stderr
    finally:
        Path(raw_path).unlink(missing_ok=True)
