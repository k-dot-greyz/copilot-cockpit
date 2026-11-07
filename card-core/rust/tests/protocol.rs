//! The protocol must answer every request with one JSON line and exit 0, including requests that
//! are malformed or name an operation or registry that does not exist. A crash is a typed failure,
//! never a traceback.

use std::io::Write;
use std::path::Path;
use std::process::{Command, Stdio};

use serde_json::{Value, json};

fn ask(request: &str) -> (Value, i32) {
    let mut child = Command::new(env!("CARGO_BIN_EXE_cardcore"))
        .arg("protocol")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    child.stdin.take().unwrap().write_all(request.as_bytes()).unwrap();
    let out = child.wait_with_output().unwrap();
    let text = String::from_utf8(out.stdout).unwrap();
    assert_eq!(text.lines().count(), 1, "exactly one response line, got {text:?}");
    (serde_json::from_str(&text).unwrap(), out.status.code().unwrap())
}

fn registries() -> Value {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../schemas/index.json");
    json!([root.canonicalize().unwrap().to_str().unwrap()])
}

fn limits() -> Value {
    json!({"max_json_bytes": 1048576, "max_nesting_depth": 32, "extends_max_depth": 8, "int_max": 9007199254740991i64})
}

fn code_of(response: &Value) -> &str {
    assert_eq!(response["ok"], json!(false), "{response}");
    response["errors"][0]["code"].as_str().unwrap()
}

#[test]
fn malformed_requests_get_a_typed_answer() {
    for (request, want) in [
        ("", "E_IMPL_PROTOCOL"),
        ("not json", "E_IMPL_PROTOCOL"),
        ("[]", "E_IMPL_PROTOCOL"),
        ("1", "E_IMPL_PROTOCOL"),
        ("null", "E_IMPL_PROTOCOL"),
        ("{\"op\": 1}", "E_IMPL_CRASH"),
        ("{\"op\": \"lint\"}", "E_IMPL_CRASH"),
    ] {
        let (response, status) = ask(request);
        assert_eq!(status, 0, "{request:?}");
        assert_eq!(code_of(&response), want, "{request:?}: {response}");
    }
}

#[test]
fn unknown_operation_is_e_op_unknown() {
    let request =
        json!({"op": "validate; rm -rf /", "input": null, "base_dir": null, "registries": registries(), "limits": limits()});
    let (response, status) = ask(&request.to_string());
    assert_eq!(status, 0);
    assert_eq!(code_of(&response), "E_OP_UNKNOWN");
    assert_eq!(response["errors"][0]["pointer"], json!(""));
}

#[test]
fn a_missing_registry_is_a_crash_report_not_a_panic() {
    let request = json!({
        "op": "validate", "input": {}, "base_dir": null,
        "registries": ["/nonexistent/index.json"], "limits": limits()
    });
    let (response, status) = ask(&request.to_string());
    assert_eq!(status, 0);
    assert_eq!(code_of(&response), "E_IMPL_CRASH");
}

#[test]
fn a_card_that_is_not_an_object_fails_the_envelope() {
    let request =
        json!({"op": "validate", "input": [1], "base_dir": null, "registries": registries(), "limits": limits()});
    let (response, _) = ask(&request.to_string());
    assert_eq!(code_of(&response), "E_SCHEMA");
}

#[test]
fn usage_errors_exit_non_zero() {
    let status = Command::new(env!("CARGO_BIN_EXE_cardcore")).arg("bogus").output().unwrap().status;
    assert_eq!(status.code(), Some(2));
}
