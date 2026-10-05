//! The stdin/stdout JSON protocol of SPEC.md section 11.
//!
//! One request in, one response out:
//!
//! ```text
//! request:  {"op", "input", "base_dir", "registries": [paths], "limits": {...}}
//! response: {"ok": true, "output": ...}  or  {"ok": false, "errors": [{"code","pointer"}]}
//! ```

use std::fs;
use std::panic::{self, AssertUnwindSafe};
use std::path::Path;

use serde_json::{Value, json};

use crate::json::{self, Limits, V, fault, lint_bytes};
use crate::ops::Ops;
use crate::schema::Engine;
use crate::{Fault, normalise};

fn failure(faults: Vec<Fault>) -> Value {
    let errors: Vec<Value> =
        normalise(faults).into_iter().map(|f| json!({ "code": f.code, "pointer": f.pointer })).collect();
    json!({ "ok": false, "errors": errors })
}

fn success(output: Option<&V>) -> Value {
    json!({ "ok": true, "output": output.map_or(Value::Null, V::to_serde) })
}

/// A failure of the implementation or its installation, not of the input.
fn crash(message: &str) -> Value {
    let text: String = message.chars().take(200).collect();
    failure(vec![Fault { code: "E_IMPL_CRASH", pointer: text }])
}

/// Handle one request and return the response as JSON text. Never panics.
pub fn handle(request_text: &str) -> String {
    let response = panic::catch_unwind(AssertUnwindSafe(|| dispatch(request_text))).unwrap_or_else(|payload| {
        let message = payload
            .downcast_ref::<String>()
            .map(String::as_str)
            .or_else(|| payload.downcast_ref::<&str>().copied())
            .unwrap_or("panic");
        crash(message)
    });
    response.to_string()
}

fn dispatch(request_text: &str) -> Value {
    let request = match json::parse(request_text) {
        Ok((value, _)) if value.is_obj() => value,
        _ => {
            return failure(vec![Fault { code: "E_IMPL_PROTOCOL", pointer: "request is not a JSON object".into() }]);
        }
    };
    let Some(op) = request.get("op").and_then(V::as_str) else {
        return crash("request has no op");
    };
    let input = request.get("input").cloned().unwrap_or(V::Null);
    let base_dir = request.get("base_dir").and_then(V::as_str).map(Path::new);
    let registries: Vec<String> = match request.get("registries") {
        Some(V::Arr(items)) => items.iter().filter_map(|v| v.as_str().map(str::to_string)).collect(),
        _ => return crash("request has no registries"),
    };
    let limits = match request.get("limits").map(Limits::from_value) {
        Some(Ok(limits)) => limits,
        Some(Err(message)) => return crash(&message),
        None => return crash("request has no limits"),
    };
    let engine = match Engine::load(&registries) {
        Ok(engine) => engine,
        Err(message) => return crash(&message),
    };
    let ops = Ops { engine: &engine, limits };
    match op {
        "lint" => {
            let Some(raw_path) = input.get("raw_path").and_then(V::as_str) else {
                return crash("lint input has no raw_path");
            };
            match fs::read(raw_path) {
                Ok(bytes) => match lint_bytes(&bytes, &limits) {
                    Ok(_) => success(None),
                    Err(errors) => failure(errors),
                },
                Err(e) => crash(&format!("{raw_path}: {e}")),
            }
        }
        "validate" => match ops.validate(&input, base_dir) {
            Ok(()) => success(None),
            Err(errors) => failure(errors),
        },
        "resolve" => outcome(ops.resolve(&input)),
        "freshness" => outcome(ops.freshness(&input)),
        "adapt" => outcome(ops.adapt(&input)),
        "unwrap" => outcome(ops.unwrap(&input)),
        _ => failure(vec![fault("E_OP_UNKNOWN", &[])]),
    }
}

fn outcome(result: Result<V, Vec<Fault>>) -> Value {
    match result {
        Ok(V::Null) => success(None),
        Ok(output) => success(Some(&output)),
        Err(errors) => failure(errors),
    }
}
