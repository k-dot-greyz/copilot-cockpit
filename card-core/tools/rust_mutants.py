#!/usr/bin/env python3
"""Source mutants of the Rust implementation: does the suite notice when each rule is broken?

Each mutant edits one snippet of the crate in a scratch copy, builds it, and runs the whole
conformance suite through the stdin/stdout protocol. A mutant that leaves every row green is a rule
that no fixture pins; a snippet that no longer matches the source is stale. Both are failures.

This is the Rust counterpart of `run_conformance.py --selftest` for the reference implementation.
It rebuilds the crate once per mutant, so it is not on the default CI path. Run locally or via the
**card-core-rust-mutants** GitHub Actions workflow (`workflow_dispatch`):

    python card-core/tools/rust_mutants.py [--jobs 4] [--only TEXT]
"""
from __future__ import annotations

import argparse
import concurrent.futures
import os
import shutil
import subprocess
import sys
import tempfile
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CRATE = ROOT / "rust"

# (name, file under src/, old snippet, new snippet). Every occurrence of `old` is replaced.
#
# Not mutated on purpose: the `is_file()` guard in pack validation. A directory that passes it
# fails the read right after and is reported as the same E_PACK_MISSING, so the mutant is
# equivalent. The path-escape guard is unreachable for the same reason as in the Python
# reference: the path grammar rejects every escaping path first.
MUTANTS: list[tuple[str, str, str, str]] = [
    # --- lint -----------------------------------------------------------------------------
    ("size limit unchecked", "json.rs", "if data.len() > limits.max_json_bytes {", "if false {"),
    ("byte-order mark accepted", "json.rs", "if data.starts_with(&[0xEF, 0xBB, 0xBF]) {", "if false {"),
    ("invalid UTF-8 accepted", "json.rs", "let Ok(text) = std::str::from_utf8(data) else {",
     "let lossy = String::from_utf8_lossy(data).into_owned();\n    let text = lossy.as_str();\n    let Ok(()) = Ok::<(), ()>(()) else {"),
    ("NaN reported as a parse error", "json.rs", 'Err(ParseFail::NonFinite) => return Err(root("E_NONFINITE")),',
     'Err(ParseFail::NonFinite) => return Err(root("E_PARSE")),'),
    ("floats accepted", "json.rs", 'V::Float(_) => self.errors.push(fault("E_FLOAT", path)),', "V::Float(_) => {}"),
    ("integer range unchecked", "json.rs", "if i.unsigned_abs() > self.limits.int_max.unsigned_abs() {", "if false {"),
    ("integer range off by one", "json.rs", "if i.unsigned_abs() > self.limits.int_max.unsigned_abs() {",
     "if i.unsigned_abs() >= self.limits.int_max.unsigned_abs() {"),
    ("non-ASCII keys accepted", "json.rs", "if !key.is_ascii() {", "if false {"),
    ("DEL in keys accepted", "json.rs", "} else if has_bad_char(key) {", "} else if false {"),
    ("DEL in strings accepted", "json.rs", "if has_bad_char(s) {", "if false {"),
    ("lone surrogates accepted", "json.rs", 'V::BadStr(_) => self.errors.push(fault("E_ENCODING", path)),', "V::BadStr(_) => {}"),
    ("nesting limit off by one", "json.rs", "if depth > self.limits.max_nesting_depth {",
     "if depth >= self.limits.max_nesting_depth {"),
    ("nesting limit unchecked", "json.rs", "if depth > self.limits.max_nesting_depth {", "if false {"),
    ("duplicate keys unreported", "json.rs", ".filter(|d| d.tokens.len() <= limits.max_nesting_depth)", ".filter(|_| false)"),
    ("duplicate keys ignore the depth limit", "json.rs", ".filter(|d| d.tokens.len() <= limits.max_nesting_depth)",
     ".filter(|_| true)"),
    ("trailing garbage accepted", "json.rs", "return if self.i == self.b.len() { Ok(value) } else { Err(ParseFail::Syntax) };", "return Ok(value);"),
    ("control characters in strings accepted", "json.rs", "if c == b'\"' || c == b'\\\\' || c < 0x20 {",
     "if c == b'\"' || c == b'\\\\' {"),
    ("lone surrogate pairs not combined", "json.rs", "if let Some(low) = low {", "if let Some(low) = low.filter(|_| false) {"),
    # --- dates, validate -------------------------------------------------------------------
    ("every fourth year is a leap year", "ops.rs", "(year % 4 == 0 && year % 100 != 0) || year % 400 == 0", "year % 4 == 0"),
    ("year zero is a real date", "ops.rs", "if year == 0 || !(1..=12).contains(&month) || day == 0 {",
     "if !(1..=12).contains(&month) || day == 0 {"),
    ("date order unchecked", "ops.rs", "if as_of > review_by {", "if false {"),
    ("date order exclusive", "ops.rs", "if as_of > review_by {", "if as_of >= review_by {"),
    ("freshness: review_by exclusive", "ops.rs", "if as_of.and_then(V::as_str) > review_by.as_str() {",
     "if as_of.and_then(V::as_str) >= review_by.as_str() {"),
    ("open-card detection off", "ops.rs", 'card.get("extends").is_some() || (entry.allow_tokens', 'false || (entry.allow_tokens'),
    ("allow_tokens ignored in open-card detection", "ops.rs", "(entry.allow_tokens && card.get(\"params\").is_some_and(has_tokens))",
     "(card.get(\"params\").is_some_and(has_tokens))"),
    ("kind-unknown pointers swapped", "ops.rs",
     'let pointer = if engine.kind_name_known(kind) { "schema_version" } else { "kind" };',
     'let pointer = if engine.kind_name_known(kind) { "kind" } else { "schema_version" };'),
    ("pack digest unchecked", "ops.rs", "if crate::sha256_label(bytes) != want {", "if false {"),
    ("pack duplicate ids accepted", "ops.rs", "if ids.contains_key(&id) {", "if false {"),
    # --- resolve ---------------------------------------------------------------------------
    ("cycle detection off", "ops.rs", "if seen.iter().any(|x| x == id) {", "if false {"),
    ("extends kind check off", "ops.rs",
     '(card.get("kind"), card.get("schema_version")) != (child.get("kind"), child.get("schema_version"))', "false"),
    ("extends depth off by one", "ops.rs", "if seen.len() > self.limits.extends_max_depth {",
     "if seen.len() >= self.limits.extends_max_depth {"),
    ("chain card envelope unchecked", "ops.rs", "let errs = engine.schema_errors(&engine.envelope_id, link.card);",
     "let errs: Vec<Fault> = Vec::new();"),
    ("visibility ratchet off", "ops.rs", "if chain[..i].iter().any(|ancestor| rank > self.visibility_rank(ancestor.card)) {",
     "if false {"),
    ("visibility ratchet allows equal", "ops.rs",
     "if chain[..i].iter().any(|ancestor| rank > self.visibility_rank(ancestor.card)) {",
     "if chain[..i].iter().any(|ancestor| rank >= self.visibility_rank(ancestor.card)) {"),
    ("card id may differ from its key", "ops.rs", 'if link.card.get("id").and_then(V::as_str) != Some(link.id.as_str()) {',
     "if false {"),
    ("$unset ignored", "ops.rs", "if out.remove(key).is_none() {", "if out.get(key).is_none() {"),
    ("orphan and missing swapped", "ops.rs", 'let code = if has_parent { "E_UNSET_MISSING" } else { "E_UNSET_ORPHAN" };',
     'let code = if has_parent { "E_UNSET_ORPHAN" } else { "E_UNSET_MISSING" };'),
    ("$unset marker accepts any value", "ops.rs", "if marker.len() == 1 && marker.get(UNSET) == Some(&V::Bool(true)) {",
     "if marker.len() == 1 {"),
    ("$unset marker accepts extra keys", "ops.rs", "if marker.len() == 1 && marker.get(UNSET) == Some(&V::Bool(true)) {",
     "if marker.get(UNSET) == Some(&V::Bool(true)) {"),
    ("partial tokens accepted", "ops.rs", "if text.contains(TOKEN_PREFIX) {", "if false {"),
    ("token key grammar unchecked", "ops.rs", "if !self.engine.dotted.is_match(key) {", "if false {"),
    ("defaults lose their type", "ops.rs", "used.insert(key.to_string(), value.clone());\n                            value.clone()",
     "used.insert(key.to_string(), value.clone());\n                            V::Str(format!(\"{value:?}\"))"),
    ("defaults visibility unchecked", "ops.rs", "if !used.is_empty() {", "if false {"),
    ("resolved card not validated", "ops.rs", "self.validate(&V::Obj(resolved), None)?;\n        let defaults = match info {",
     "let _ = resolved;\n        let defaults = match info {"),
    ("allow_tokens ignored in merge", "ops.rs", 'let allow_tokens = self.engine.kind(kind, version).expect("checked").allow_tokens;\n            let params', 'let allow_tokens = true;\n            let params'),
    # --- adapt -----------------------------------------------------------------------------
    ("legacy status ignored", "ops.rs", "let legacy_status = if dialect.dex {", "let legacy_status = if false && dialect.dex {"),
    ("aliases dropped", "ops.rs", "if !aliases.is_empty() {", "if false {"),
    ("ids not lowercased", "ops.rs", "text.to_ascii_lowercase()", "text.to_string()"),
    ("ids lowercased with unicode folding", "ops.rs", "text.to_ascii_lowercase()", "text.to_lowercase()"),
    ("adapter id length unchecked", "ops.rs", ".is_some_and(|max| new_id.chars().count() > max);", ".is_some_and(|_| false);"),
    ("unwrap loses data", "ops.rs", "Ok(o.clone())", "Ok(V::obj([]))"),
    # --- schema engine ---------------------------------------------------------------------
    ("composite errors not flattened", "schema.rs", "for branch in context {", "for branch in context.iter().take(0) {"),
    ("visibility order inverted", "schema.rs", "order.len() - 1 - i", "i"),
]


def build(work: Path, target: Path) -> subprocess.CompletedProcess:
    env = dict(os.environ, CARGO_TARGET_DIR=str(target))
    return subprocess.run(["cargo", "build", "--offline", "--locked", "--quiet"], cwd=work, env=env,
                          capture_output=True, text=True)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--jobs", type=int, default=2, help="suites run in parallel (builds are serial)")
    ap.add_argument("--only", help="run only mutants whose name contains this text")
    args = ap.parse_args()

    chosen = [m for m in MUTANTS if not args.only or args.only in m[0]]
    scratch = Path(tempfile.mkdtemp(prefix="cardcore-mutants-"))
    work = scratch / "rust"
    shutil.copytree(CRATE, work, ignore=shutil.ignore_patterns("target"))
    target = scratch / "target"
    print(f"scratch: {scratch}\nwarming the build (full compile once) ...", flush=True)
    warm = build(work, target)
    if warm.returncode != 0:
        print("the unmodified crate does not build:\n" + warm.stderr)
        return 2

    suite = [sys.executable, str(ROOT / "tools" / "run_conformance.py")]
    results: dict[str, str] = {}
    lock = threading.Lock()

    def judge(name: str, binary: Path) -> None:
        proc = subprocess.run(suite + ["--impl-cmd", f"{binary} protocol"], capture_output=True, text=True)
        tail = proc.stdout.strip().splitlines()[-1] if proc.stdout.strip() else "no output"
        with lock:
            results[name] = "KILLED" if proc.returncode != 0 else "SURVIVED"
            print(f"  {results[name]:9} {name}   [{tail}]", flush=True)

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.jobs) as pool:
        pending = []
        for n, (name, rel, old, new) in enumerate(chosen):
            path = work / "src" / rel
            original = path.read_text(encoding="utf-8")
            if old not in original:
                results[name] = "STALE"
                print(f"  STALE     {name}   (snippet not found in {rel})", flush=True)
                continue
            path.write_text(original.replace(old, new), encoding="utf-8")
            built = build(work, target)
            path.write_text(original, encoding="utf-8")
            if built.returncode != 0:
                results[name] = "BROKEN"
                first = next((l for l in built.stderr.splitlines() if l.startswith("error")), "build failed")
                print(f"  BROKEN    {name}   ({first})", flush=True)
                continue
            binary = scratch / f"mutant-{n}"
            shutil.copy2(target / "debug" / "cardcore", binary)
            pending.append(pool.submit(judge, name, binary))
        for fut in pending:
            fut.result()

    killed = sum(v == "KILLED" for v in results.values())
    bad = {k: v for k, v in results.items() if v != "KILLED"}
    print(f"\nRust implementation mutants: {killed}/{len(chosen)} killed")
    for name, state in bad.items():
        print(f"  {state}: {name}")
    shutil.rmtree(scratch, ignore_errors=True)
    return 0 if not bad else 1


if __name__ == "__main__":
    sys.exit(main())
