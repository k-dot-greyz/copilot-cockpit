"""CC-PR31: protocol boundary UX/security stories for the Rust conformance target.

Feat implementation: PR #31 on copilot-cockpit (card-core Rust + expanded suite).
These tests complement the 427 parametrized conformance rows with harness-level
checks: CI contract, hostile protocol envelopes, and dual-impl parity when a
release `cardcore` binary is present (required in the Conformance (Rust) CI job).
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

_BY_ID = {r.id: r for r in ROWS}
CURATED_ROWS = [_BY_ID[i] for i in CURATED_ROW_IDS]
assert len(CURATED_ROWS) == len(CURATED_ROW_IDS), "curated list must match suite ids"

WORKFLOW = REPO_ROOT / ".github" / "workflows" / "card-core.yml"
MUTANTS_WORKFLOW = REPO_ROOT / ".github" / "workflows" / "card-core-rust-mutants.yml"

# Garbage stdin: non-objects are protocol, objects with a non-string op are a typed crash.
MALFORMED_PROTOCOL = [
    pytest.param("", "E_IMPL_PROTOCOL", id="empty"),
    pytest.param("not json", "E_IMPL_PROTOCOL", id="not-json"),
    pytest.param("[]", "E_IMPL_PROTOCOL", id="array"),
    pytest.param("1", "E_IMPL_PROTOCOL", id="number"),
    pytest.param("null", "E_IMPL_PROTOCOL", id="null"),
    pytest.param('{"op": 1}', "E_IMPL_CRASH", id="op-not-string"),
]

HOSTILE_OP = "validate; rm -rf /"


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


def _lint_request(raw_path: str) -> dict:
    return {
        "op": "lint",
        "input": {"raw_path": raw_path},
        "base_dir": None,
        "registries": [str(p) for p in rc.registry_paths(ROOT)],
        "limits": LIMITS,
    }


def _unknown_op_request() -> dict:
    return {
        "op": HOSTILE_OP,
        "input": {},
        "base_dir": None,
        "registries": [str(p) for p in rc.registry_paths(ROOT)],
        "limits": LIMITS,
    }


def _assert_one_json_line(stdout: str, code: int, stderr: str, *, host: str) -> dict:
    assert code == 0
    assert stdout.endswith("\n"), f"{host}: protocol response must be one JSON line"
    assert stdout.count("\n") == 1, f"{host}: extra newlines in {stdout!r}"
    if host == "python":
        assert "Traceback" not in stdout
        assert "Traceback" not in stderr
    else:
        assert "panic" not in stderr.lower()
    body = json.loads(stdout)
    assert body["ok"] is False
    return body


def _assert_lint_no_exfil(cmd: list[str], contents: str, secret: str, *, expect_ok: bool, expect_code: str | None) -> None:
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tmp:
        tmp.write(contents)
        raw_path = tmp.name
    try:
        body, code, stderr = _protocol_json(cmd, _lint_request(raw_path))
        assert code == 0
        dumped = json.dumps(body)
        assert secret not in dumped
        assert secret not in stderr
        if expect_ok:
            assert body.get("ok") is True, dumped
        else:
            assert body.get("ok") is False, dumped
            assert body["errors"][0]["code"] == expect_code, dumped
    finally:
        Path(raw_path).unlink(missing_ok=True)


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
    """CC31-CI-01 (DX, medium): CI must exercise the Rust binary on the full suite and protocol pytest."""
    text = WORKFLOW.read_text(encoding="utf-8")
    assert "Conformance (Rust)" in text
    assert "cargo build --release" in text
    assert "run_conformance.py --impl-cmd" in text
    assert "cardcore protocol" in text
    assert "CARD_CORE_RUST_BIN" in text
    assert "test_protocol_ux_security_pr31.py" in text


def test_cc31_ci_mutants_workflow_fetches_deps_before_offline_builds():
    """CC31-CI-02: manual mutants job must cargo fetch, then invoke rust_mutants.py via env (not ${{ inputs }} in run)."""
    text = MUTANTS_WORKFLOW.read_text(encoding="utf-8")
    assert "workflow_dispatch" in text
    assert "cargo fetch --locked" in text
    assert "rust_mutants.py" in text
    assert "MUTANTS_ONLY: ${{ inputs.only }}" in text
    assert "MUTANTS_JOBS: ${{ inputs.jobs }}" in text
    assert "--jobs \"$MUTANTS_JOBS\"" in text
    assert "--only \"$MUTANTS_ONLY\"" in text
    script = text.split("python card-core/tools/rust_mutants.py", 1)[1]
    assert "${{ inputs." not in script


def test_cc31_happy_ref_cli_sample_matches_in_process():
    """CC31-H-01 (high): Python protocol adapter agrees with in-process reference on a sample."""
    sample = []
    for op in sorted(rc.OPS):
        sample.extend([r for r in ROWS if r.op == op][:4])
    for row in sample:
        passed, message = rc.check_row(row, REF_CLI, ROOT, LIMITS)
        assert passed, f"{row.id}: {message}"


@pytest.mark.parametrize("row", CURATED_ROWS, ids=CURATED_ROW_IDS)
def test_cc31_happy_curated_rows_via_ref_cli(row):
    """CC31-H-02 (high): High-blast-radius PR #31 rules pass through the external protocol."""
    passed, message = rc.check_row(row, REF_CLI, ROOT, LIMITS)
    assert passed, message


def test_cc31_sec_lint_does_not_echo_file_bytes_in_response():
    """CC31-SEC-01 (critical): lint reads bytes but never returns raw file content on success."""
    secret = "CC31-SECRET-PAYLOAD-7f3a9c"
    _assert_lint_no_exfil(
        REF_CLI.cmd,
        '{"ok": true, "note": "%s"}' % secret,
        secret,
        expect_ok=True,
        expect_code=None,
    )


def test_cc31_sec_lint_parse_error_does_not_echo_file_bytes():
    """CC31-SEC-01b: invalid JSON still proves the file was read (E_PARSE) without echoing it."""
    secret = "CC31-SECRET-UNPARSED-c91e"
    _assert_lint_no_exfil(
        REF_CLI.cmd,
        "not-json " + secret,
        secret,
        expect_ok=False,
        expect_code="E_PARSE",
    )


def test_cc31_sec_crash_path_stdout_is_json_not_traceback():
    """CC31-SEC-02 (high): registry load failures become E_IMPL_CRASH JSON, not a traceback on stdout or stderr."""
    request = {
        "op": "validate",
        "input": {},
        "base_dir": None,
        "registries": ["/nonexistent/card-core/schemas/index.json"],
        "limits": LIMITS,
    }
    stdout, code, stderr = _protocol_raw(REF_CLI.cmd, json.dumps(request))
    body = _assert_one_json_line(stdout, code, stderr, host="python")
    assert body["errors"][0]["code"] == "E_IMPL_CRASH"


@pytest.mark.parametrize("payload, want", MALFORMED_PROTOCOL)
def test_cc31_sad_ref_cli_malformed_protocol_single_line_exit_zero(payload: str, want: str):
    """CC31-S-03 (high): Python ref_cli matches Rust — pin the code, not a {PROTOCOL, CRASH} soup."""
    stdout, code, stderr = _protocol_raw(REF_CLI.cmd, payload)
    body = _assert_one_json_line(stdout, code, stderr, host="python")
    assert body["errors"][0]["code"] == want, payload


def test_cc31_sad_unknown_op_is_typed_not_shell_injection():
    """CC31-S-01 (high): bizarre op strings are E_OP_UNKNOWN, not interpreted by the host shell."""
    body, code, stderr = _protocol_json(REF_CLI.cmd, _unknown_op_request())
    assert code == 0
    assert "Traceback" not in stderr
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


@pytest.mark.parametrize("row", CURATED_ROWS, ids=CURATED_ROW_IDS)
def test_cc31_happy_curated_rows_via_rust(row, rust_impl: rc.CommandImpl):
    """CC31-H-04 (high): Curated PR #31 rows through the Rust protocol adapter."""
    passed, message = rc.check_row(row, rust_impl, ROOT, LIMITS)
    assert passed, message


@pytest.mark.parametrize("payload, want", MALFORMED_PROTOCOL)
def test_cc31_sad_rust_malformed_protocol_single_line_exit_zero(
    payload: str, want: str, rust_impl: rc.CommandImpl
):
    """CC31-S-02 (high): Malformed stdin still yields one JSON line and exit 0 (no panic on stderr)."""
    stdout, code, stderr = _protocol_raw(rust_impl.cmd, payload)
    body = _assert_one_json_line(stdout, code, stderr, host="rust")
    assert body["errors"][0]["code"] == want, payload


def test_cc31_sad_rust_unknown_op_is_typed_not_shell_injection(rust_impl: rc.CommandImpl):
    """CC31-S-01 on Rust: same hostile op string, same typed miss, still not a shell."""
    body, code, stderr = _protocol_json(rust_impl.cmd, _unknown_op_request())
    assert code == 0
    assert "panic" not in stderr.lower()
    assert body["ok"] is False
    assert body["errors"][0]["code"] == "E_OP_UNKNOWN"


def test_cc31_ablation_python_and_rust_agree_on_curated_rows(rust_impl: rc.CommandImpl):
    """CC31-A-01 (high): Dual-impl parity on curated rows — graceful ablation if either diverges."""
    for row in CURATED_ROWS:
        py = REF_CLI.run(row.op, row.input, row.base_dir, {**LIMITS, **row.limits})
        rs = rust_impl.run(row.op, row.input, row.base_dir, {**LIMITS, **row.limits})
        assert py == rs, f"{row.id}: python {py!r} rust {rs!r}"


def test_cc31_sec_rust_lint_does_not_echo_file_bytes(rust_impl: rc.CommandImpl):
    """CC31-SEC-03 (critical): Rust lint path matches the no-exfiltration contract."""
    secret = "CC31-RUST-SECRET-b4e2"
    _assert_lint_no_exfil(
        rust_impl.cmd,
        '{"x": "%s"}' % secret,
        secret,
        expect_ok=True,
        expect_code=None,
    )


def test_cc31_sec_rust_lint_parse_error_does_not_echo_file_bytes(rust_impl: rc.CommandImpl):
    """CC31-SEC-03b: Rust E_PARSE path also refuses to echo attacker-controlled file bytes."""
    secret = "CC31-RUST-UNPARSED-aa07"
    _assert_lint_no_exfil(
        rust_impl.cmd,
        "not-json " + secret,
        secret,
        expect_ok=False,
        expect_code="E_PARSE",
    )
