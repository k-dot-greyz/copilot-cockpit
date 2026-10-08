//! Card Core v1 in Rust: a conformance target for `card-core/SPEC.md`.
//!
//! Behaviour is defined by the specification and pinned by `card-core/conformance/`; this crate
//! is one implementation of that contract. It contains no defaults: limits, kinds and schemas
//! are read from the registries the caller names, exactly as the reference implementation does.

pub mod json;
pub mod ops;
pub mod protocol;
pub mod schema;

/// One failure: a stable code and an RFC 6901 pointer into the request.
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct Fault {
    pub code: &'static str,
    pub pointer: String,
}

/// Sort by (code, pointer) and drop repeats, as the specification's output rule requires.
pub fn normalise(mut faults: Vec<Fault>) -> Vec<Fault> {
    faults.sort();
    faults.dedup();
    faults
}

/// `sha256:` followed by the lowercase hex SHA-256 of `bytes` (SPEC 9).
pub fn sha256_label(bytes: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    use std::fmt::Write;
    let mut out = String::from("sha256:");
    for byte in Sha256::digest(bytes).iter() {
        let _ = write!(out, "{byte:02x}");
    }
    out
}
