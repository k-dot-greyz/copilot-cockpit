//! Runs the language-neutral conformance suite against this crate's binary through the
//! stdin/stdout protocol, using the Python harness. The harness is the oracle; this crate has no
//! second copy of the rules.
//!
//! Needs `python3` and `pip install -r card-core/requirements.txt` (the harness also hosts the
//! reference implementation). Set `CARDCORE_SKIP_CONFORMANCE=1` to skip it deliberately; a missing
//! Python is otherwise a failure, never a silent pass.

use std::path::Path;
use std::process::Command;

#[test]
fn every_conformance_row_passes_through_the_protocol() {
    if std::env::var_os("CARDCORE_SKIP_CONFORMANCE").is_some() {
        eprintln!("CARDCORE_SKIP_CONFORMANCE is set: the conformance suite was NOT run");
        return;
    }
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("..");
    let python = std::env::var("PYTHON").unwrap_or_else(|_| "python3".to_string());
    let command = format!("{} protocol", env!("CARGO_BIN_EXE_cardcore"));
    let out = Command::new(&python)
        .arg(root.join("tools/run_conformance.py"))
        .args(["--impl-cmd", &command])
        .output()
        .unwrap_or_else(|e| panic!("cannot run {python}: {e} (set CARDCORE_SKIP_CONFORMANCE=1 to skip)"));
    let stdout = String::from_utf8_lossy(&out.stdout);
    let stderr = String::from_utf8_lossy(&out.stderr);
    assert!(out.status.success(), "conformance suite failed\n{stdout}\n{stderr}");
    assert!(stdout.contains("0 failed"), "unexpected harness output\n{stdout}");
}
