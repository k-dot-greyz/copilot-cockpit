//! The digests recorded in the conformance cases were computed by `tools/digest.sh` (jq and
//! sha256sum), independently of any implementation. This crate must reproduce every one of them.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use cardcore::json::{V, parse};

fn conformance_dir() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../conformance")
}

fn collect(dir: &Path, out: &mut Vec<PathBuf>) {
    for entry in fs::read_dir(dir).unwrap() {
        let path = entry.unwrap().path();
        if path.is_dir() {
            collect(&path, out);
        } else if path.extension().is_some_and(|x| x == "json") {
            out.push(path);
        }
    }
}

/// Every `{"golden": ..., "digest": ...}` pair anywhere in a case file.
fn pairs(node: &V, out: &mut Vec<(String, String)>) {
    match node {
        V::Obj(map) => {
            if let (Some(V::Str(g)), Some(V::Str(d))) = (map.get("golden"), map.get("digest")) {
                out.push((g.clone(), d.clone()));
            }
            map.values().for_each(|v| pairs(v, out));
        }
        V::Arr(items) => items.iter().for_each(|v| pairs(v, out)),
        _ => {}
    }
}

#[test]
fn digests_match_the_ones_recorded_by_jq() {
    let mut files = Vec::new();
    collect(&conformance_dir().join("cases"), &mut files);
    let mut checked = 0;
    for file in files {
        // Case files may carry lone-surrogate escapes, which serde_json refuses; the crate's own
        // parser keeps them.
        let (doc, _) = parse(&fs::read_to_string(&file).unwrap()).unwrap();
        let mut found = Vec::new();
        pairs(&doc, &mut found);
        for (golden, want) in found {
            let out = Command::new(env!("CARGO_BIN_EXE_cardcore"))
                .arg("digest")
                .arg(conformance_dir().join(&golden))
                .output()
                .unwrap();
            assert!(out.status.success(), "{golden}: {}", String::from_utf8_lossy(&out.stderr));
            assert_eq!(String::from_utf8(out.stdout).unwrap().trim(), want, "{golden}");
            checked += 1;
        }
    }
    assert!(checked > 20, "only {checked} digests found; the scan is broken");
}

#[test]
fn digest_reads_stdin_and_rejects_floats() {
    use std::io::Write;
    use std::process::Stdio;
    let run = |input: &str| {
        let mut child = Command::new(env!("CARGO_BIN_EXE_cardcore"))
            .args(["digest", "-"])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .unwrap();
        child.stdin.take().unwrap().write_all(input.as_bytes()).unwrap();
        child.wait_with_output().unwrap()
    };
    // Key order and whitespace do not change the digest.
    let a = run(r#"{"b": 1, "a": [true, null]}"#);
    let b = run("{\"a\":[true,null],\"b\":1}");
    assert!(a.status.success() && b.status.success());
    assert_eq!(a.stdout, b.stdout);
    // Canonical form has no floats, so there is no digest for one.
    assert!(!run(r#"{"a": 1.5}"#).status.success());
}
