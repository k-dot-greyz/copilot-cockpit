#!/usr/bin/env python3
"""Card Core conformance harness. Normative behaviour is in SPEC.md section 11.

Drives an implementation through the conformance suite in conformance/.

  python3 tools/run_conformance.py                   in-process reference implementation
  python3 tools/run_conformance.py --impl-cmd CMD    any implementation speaking the stdin/stdout protocol
  python3 tools/run_conformance.py --selftest        prove the suite goes red when it should

Exit status: 0 all rows pass, 1 a row failed, 2 the suite itself is broken.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import shlex
import subprocess
import sys
import types
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

HERE = Path(__file__).resolve().parent
DEFAULT_ROOT = HERE.parent
OPS = {"lint", "validate", "resolve", "freshness", "adapt"}


# ---------------------------------------------------------------------------
# canonical JSON (independent of the implementation under test)
# ---------------------------------------------------------------------------


def canonical(obj: Any) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def digest(obj: Any) -> str:
    return "sha256:" + hashlib.sha256(canonical(obj)).hexdigest()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# rows
# ---------------------------------------------------------------------------


@dataclass
class Row:
    id: str
    op: str
    input: Any
    expect: dict
    base_dir: Path | None
    limits: dict
    case_file: str


class SuiteError(Exception):
    """The suite itself is inconsistent (not an implementation failure)."""


def _unescape(token: str) -> str:
    return token.replace("~1", "/").replace("~0", "~")


def _split_pointer(pointer: str) -> list[str]:
    if pointer == "":
        return []
    if not pointer.startswith("/"):
        raise SuiteError(f"bad pointer {pointer!r}")
    return [_unescape(t) for t in pointer[1:].split("/")]


def _walk(doc: Any, tokens: list[str], pointer: str) -> Any:
    cur = doc
    for tok in tokens:
        if isinstance(cur, dict) and tok in cur:
            cur = cur[tok]
        elif isinstance(cur, list) and tok.isdigit() and int(tok) < len(cur):
            cur = cur[int(tok)]
        else:
            raise SuiteError(f"pointer {pointer!r} does not resolve")
    return cur


def apply_mutation(doc: Any, mutation: dict) -> Any:
    out = copy.deepcopy(doc)
    for pointer in mutation.get("remove", []):
        tokens = _split_pointer(pointer)
        if not tokens:
            raise SuiteError("cannot remove the document root")
        parent = _walk(out, tokens[:-1], pointer)
        last = tokens[-1]
        if isinstance(parent, dict) and last in parent:
            del parent[last]
        elif isinstance(parent, list) and last.isdigit() and int(last) < len(parent):
            del parent[int(last)]
        else:
            raise SuiteError(f"remove {pointer!r}: nothing to remove")
    for pointer, value in mutation.get("set", {}).items():
        tokens = _split_pointer(pointer)
        if not tokens:
            raise SuiteError("cannot replace the document root")
        parent = _walk(out, tokens[:-1], pointer)
        last = tokens[-1]
        if isinstance(parent, dict):
            parent[last] = copy.deepcopy(value)
        elif isinstance(parent, list) and last.isdigit() and int(last) <= len(parent):
            if int(last) == len(parent):
                parent.append(copy.deepcopy(value))
            else:
                parent[int(last)] = copy.deepcopy(value)
        else:
            raise SuiteError(f"set {pointer!r}: parent is not a container")
    return out


def load_rows(root: Path) -> tuple[list[Row], list[str]]:
    """Return all rows plus a list of suite-consistency problems."""
    conf = root / "conformance"
    problems: list[str] = []
    index = load_json(conf / "index.json")
    listed = index.get("cases", [])
    cases_dir = conf / "cases"

    if listed != sorted(set(listed)):
        problems.append("index.json: cases must be sorted and unique")
    on_disk = sorted(str(p.relative_to(cases_dir)) for p in cases_dir.rglob("*.case.json"))
    for rel in on_disk:
        if rel not in listed:
            problems.append(f"index.json: case file not listed: {rel}")
    for rel in listed:
        if not (cases_dir / rel).is_file():
            problems.append(f"index.json: listed file missing: {rel}")

    rows: list[Row] = []
    seen: set[str] = set()
    referenced_goldens: set[str] = set()

    def add(row: Row) -> None:
        if row.id in seen:
            problems.append(f"duplicate row id: {row.id}")
        seen.add(row.id)
        rows.append(row)
        g = row.expect.get("golden")
        if g:
            referenced_goldens.add(g)

    for rel in listed:
        path = cases_dir / rel
        if not path.is_file():
            continue
        case = load_json(path)
        case_id = rel[: -len(".case.json")]
        op = case.get("op")
        if op not in OPS:
            problems.append(f"{case_id}: unknown op {op!r}")
            continue
        base_dir = (path.parent / case["base_dir"]).resolve() if case.get("base_dir") else None
        if base_dir is not None and not base_dir.is_dir():
            problems.append(f"{case_id}: base_dir missing")
        case_limits = case.get("limits", {})

        if "rows" in case:
            names = set()
            for r in case["rows"]:
                if r["name"] in names:
                    problems.append(f"{case_id}: duplicate row name {r['name']}")
                names.add(r["name"])
                raw = (path.parent / r["raw"]).resolve()
                if not raw.is_file():
                    problems.append(f"{case_id}#{r['name']}: raw file missing")
                add(Row(f"{case_id}#{r['name']}", op, {"raw_path": str(raw)}, r["expect"], base_dir,
                        {**case_limits, **r.get("limits", {})}, rel))
            continue

        if "expect" not in case:
            problems.append(f"{case_id}: missing base expect")
            continue
        add(Row(case_id, op, case["input"], case["expect"], base_dir, case_limits, rel))
        names = set()
        for m in case.get("mutations", []):
            if m["name"] in names:
                problems.append(f"{case_id}: duplicate mutation name {m['name']}")
            names.add(m["name"])
            try:
                mutated = apply_mutation(case["input"], m)
            except SuiteError as exc:
                problems.append(f"{case_id}#{m['name']}: {exc}")
                continue
            add(Row(f"{case_id}#{m['name']}", op, mutated, m["expect"], base_dir,
                    {**case_limits, **m.get("limits", {})}, rel))

    golden_dir = conf / "golden"
    for g in sorted(golden_dir.glob("*.json")):
        if f"golden/{g.name}" not in referenced_goldens:
            problems.append(f"golden not referenced by any row: {g.name}")
    for g in referenced_goldens:
        if not (conf / g).is_file():
            problems.append(f"golden missing: {g}")
    return rows, problems


# ---------------------------------------------------------------------------
# implementations
# ---------------------------------------------------------------------------


def registry_paths(root: Path) -> list[Path]:
    index = load_json(root / "conformance" / "index.json")
    return [(root / "conformance" / r).resolve() for r in index["registries"]]


def load_limits(root: Path) -> dict:
    index = load_json(root / "conformance" / "index.json")
    return load_json((root / "conformance" / index["limits"]).resolve())


class InProcessImpl:
    name = "reference (in-process)"

    def __init__(self, root: Path, mutate: Callable[[dict], None] | None = None, source: str | None = None):
        sys.path.insert(0, str(HERE))
        if source is None:
            import cardcore_ref  # noqa: PLC0415
        else:
            cardcore_ref = types.ModuleType("cardcore_ref_mutant")
            exec(compile(source, "<mutant>", "exec"), cardcore_ref.__dict__)  # noqa: S102

        self._ref = cardcore_ref.Ref(registry_paths(root), mutate=mutate)

    def run(self, op: str, input: Any, base_dir: Path | None, limits: dict) -> dict:
        return self._ref.run(op, input, str(base_dir) if base_dir else None, limits)


class CommandImpl:
    def __init__(self, root: Path, cmd: str):
        self.cmd = shlex.split(cmd)
        self.name = f"external ({cmd})"
        self._registries = [str(p) for p in registry_paths(root)]

    def run(self, op: str, input: Any, base_dir: Path | None, limits: dict) -> dict:
        request = {
            "op": op,
            "input": input,
            "base_dir": str(base_dir) if base_dir else None,
            "registries": self._registries,
            "limits": limits,
        }
        proc = subprocess.run(self.cmd, input=json.dumps(request), capture_output=True, text=True, timeout=60)
        try:
            return json.loads(proc.stdout)
        except json.JSONDecodeError:
            return {"ok": False, "errors": [{"code": "E_IMPL_PROTOCOL", "pointer": proc.stderr.strip()[:200]}]}


# ---------------------------------------------------------------------------
# matching
# ---------------------------------------------------------------------------


def _fmt_errors(errors: list[dict]) -> str:
    return "[" + ", ".join(f"{e.get('code')}@{e.get('pointer', '')!r}" for e in errors) + "]"


def check_row(row: Row, impl: Any, root: Path, limits_base: dict) -> tuple[bool, str]:
    result = impl.run(row.op, row.input, row.base_dir, {**limits_base, **row.limits})
    expect = row.expect
    if expect["ok"]:
        if not result.get("ok"):
            return False, f"expected ok, got errors {_fmt_errors(result.get('errors', []))}"
        if "golden" in expect:
            golden = load_json(root / "conformance" / expect["golden"])
            if digest(golden) != expect["digest"]:
                return False, "suite bug: golden file does not match its stated digest"
            out = result.get("output")
            if canonical(out) != canonical(golden):
                return False, f"output differs from golden (got digest {digest(out)}, want {expect['digest']})"
        if expect.get("roundtrip"):
            back = impl.run("unwrap", result["output"], row.base_dir, limits_base)
            if not back.get("ok"):
                return False, f"unwrap failed {_fmt_errors(back.get('errors', []))}"
            if canonical(back["output"]) != canonical(row.input["legacy"]):
                return False, "round trip: unwrap(adapt(x)) != x"
        return True, ""

    if result.get("ok"):
        return False, f"expected errors {_fmt_errors(expect['errors'])}, got ok"
    got = result.get("errors", [])
    want_codes = {e["code"] for e in expect["errors"]}
    got_codes = {e.get("code") for e in got}
    if want_codes != got_codes:
        return False, f"expected codes {sorted(want_codes)}, got {_fmt_errors(got)}"
    for e in expect["errors"]:
        if "pointer" in e and not any(g.get("code") == e["code"] and g.get("pointer") == e["pointer"] for g in got):
            return False, f"expected {e['code']}@{e['pointer']!r}, got {_fmt_errors(got)}"
    return True, ""


def run_rows(rows: list[Row], impl: Any, root: Path, limits_base: dict) -> list[tuple[Row, bool, str]]:
    out = []
    for row in rows:
        try:
            passed, msg = check_row(row, impl, root, limits_base)
        except Exception as exc:  # an implementation crash is a failed row, not a crashed suite
            passed, msg = False, f"implementation raised {type(exc).__name__}: {exc}"
        out.append((row, passed, msg))
    return out


# ---------------------------------------------------------------------------
# selftest: the suite must have teeth
# ---------------------------------------------------------------------------


def _drop_keys(node: Any, keys: set[str]) -> None:
    if isinstance(node, dict):
        for k in list(node):
            if k in keys:
                del node[k]
            else:
                _drop_keys(node[k], keys)
    elif isinstance(node, list):
        for item in node:
            _drop_keys(item, keys)


def _find(schemas: dict, suffix: str) -> dict:
    for sid, schema in schemas.items():
        if sid.endswith(suffix):
            return schema
    raise SuiteError(f"selftest: schema {suffix} not found")


def _w_card_closure(schemas: dict) -> None:
    _drop_keys(_find(schemas, "/card.v1.json"), {"unevaluatedProperties"})
    _drop_keys(_find(schemas, "/asset.v1.json"), {"unevaluatedProperties"})


def _w_envelope_required(schemas: dict) -> None:
    _find(schemas, "/envelope.v1.json")["required"] = []


def _w_asset_conditionals(schemas: dict) -> None:
    asset = _find(schemas, "/asset.v1.json")
    asset["allOf"] = [a for a in asset.get("allOf", []) if "if" not in a]
    _drop_keys(asset, {"if", "then", "else"})


def _w_id_pattern(schemas: dict) -> None:
    _find(schemas, "/core.v1.json")["$defs"]["id"]["pattern"] = "^.*$"


def _w_path_pattern(schemas: dict) -> None:
    _find(schemas, "/core.v1.json")["$defs"]["path"]["pattern"] = "^.*$"


def _w_length_limits(schemas: dict) -> None:
    for schema in schemas.values():
        _drop_keys(schema, {"maxLength", "maxItems", "maxProperties"})


def _w_date_pattern(schemas: dict) -> None:
    _find(schemas, "/core.v1.json")["$defs"]["date"]["pattern"] = "^.*$"


WEAKENINGS: dict[str, Callable[[dict], None]] = {
    "remove card and asset closure": _w_card_closure,
    "remove envelope required list": _w_envelope_required,
    "remove asset conditionals": _w_asset_conditionals,
    "widen id pattern": _w_id_pattern,
    "widen path pattern": _w_path_pattern,
    "remove length limits": _w_length_limits,
    "widen date pattern": _w_date_pattern,
}


def run_mutants(root: Path, rows: list[Row], limits_base: dict, verbose: bool) -> bool:
    """Source-level mutants of the reference implementation must each turn a row red."""
    sys.path.insert(0, str(HERE))
    import ref_mutants  # noqa: PLC0415

    source = (HERE / "cardcore_ref.py").read_text(encoding="utf-8")
    survivors, stale = [], []
    for name, old, new in ref_mutants.MUTANTS:
        if old not in source:
            stale.append(name)
            continue
        impl = InProcessImpl(root, source=source.replace(old, new))
        results = run_rows(rows, impl, root, limits_base)
        red = sum(1 for _, passed, _ in results if not passed)
        if verbose:
            print(f"    mutant '{name}': {red} rows went red")
        if red == 0:
            survivors.append(name)
    total = len(ref_mutants.MUTANTS)
    killed = total - len(survivors) - len(stale)
    print(f"  implementation mutants: {killed}/{total} killed")
    for name in stale:
        print(f"    STALE (snippet no longer in source): {name}")
    for name in survivors:
        print(f"    SURVIVED (no row notices): {name}")
    return not survivors and not stale


def selftest(root: Path, rows: list[Row], limits_base: dict, verbose: bool = False) -> bool:
    ok = True
    real = InProcessImpl(root)

    # 1. flipped expectations must all be rejected
    escaped = []
    for row in rows:
        flipped = copy.deepcopy(row)
        flipped.expect = (
            {"ok": False, "errors": [{"code": "E_NEVER"}]} if row.expect["ok"] else {"ok": True}
        )
        passed, _ = check_row(flipped, real, root, limits_base)
        if passed:
            escaped.append(row.id)
    print(f"  canary flip-every-expectation: {len(rows) - len(escaped)}/{len(rows)} caught")
    if escaped:
        ok = False
        print("    not caught:", ", ".join(escaped[:10]))

    # 2. a corrupted digest must be rejected
    with_digest = [r for r in rows if "digest" in r.expect]
    missed = []
    for row in with_digest:
        bad = copy.deepcopy(row)
        d = row.expect["digest"]
        bad.expect["digest"] = d[:-1] + ("0" if d[-1] != "0" else "1")
        passed, _ = check_row(bad, real, root, limits_base)
        if passed:
            missed.append(row.id)
    print(f"  canary corrupt-digest: {len(with_digest) - len(missed)}/{len(with_digest)} caught")
    if missed:
        ok = False

    # 3. weakened schemas must make the suite fail
    for name, weaken in WEAKENINGS.items():
        weak = InProcessImpl(root, mutate=weaken)
        results = run_rows(rows, weak, root, limits_base)
        failing = [r.id for r, passed, _ in results if not passed]
        print(f"  canary schema weakening '{name}': {len(failing)} rows went red")
        if not failing:
            ok = False
    if not run_mutants(root, rows, limits_base, verbose):
        ok = False
    return ok


# ---------------------------------------------------------------------------
# cli
# ---------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", type=Path, default=DEFAULT_ROOT, help="card-core directory")
    ap.add_argument("--impl-cmd", help="command that speaks the JSON stdin/stdout protocol")
    ap.add_argument("--case", help="only rows whose id contains this text")
    ap.add_argument("--op", choices=sorted(OPS), help="only rows for this operation")
    ap.add_argument("--list", action="store_true", help="list row ids and exit")
    ap.add_argument("--selftest", action="store_true", help="prove the suite detects broken expectations and schemas")
    ap.add_argument("-v", "--verbose", action="store_true", help="show every failure")
    args = ap.parse_args(argv)
    root = args.root.resolve()

    try:
        rows, problems = load_rows(root)
        limits_base = load_limits(root)
    except (OSError, KeyError, json.JSONDecodeError) as exc:
        print(f"suite cannot be loaded: {exc}", file=sys.stderr)
        return 2
    if args.case:
        rows = [r for r in rows if args.case in r.id]
    if args.op:
        rows = [r for r in rows if r.op == args.op]
    if args.list:
        for r in rows:
            print(r.id)
        return 0

    impl = CommandImpl(root, args.impl_cmd) if args.impl_cmd else InProcessImpl(root)
    print(f"card-core conformance | {impl.name}")

    if problems:
        print(f"suite is inconsistent ({len(problems)} problems):")
        for p in problems[:30]:
            print("  -", p)
        return 2

    if args.selftest:
        if args.impl_cmd:
            print("--selftest needs the in-process reference implementation", file=sys.stderr)
            return 2
        print("selftest: the suite must not be a rubber stamp")
        good = selftest(root, rows, limits_base, args.verbose)
        print("selftest:", "OK, every canary was caught" if good else "FAILED, the suite has no teeth")
        return 0 if good else 1

    results = run_rows(rows, impl, root, limits_base)
    per_op: dict[str, list[int]] = {}
    for row, passed, _ in results:
        c = per_op.setdefault(row.op, [0, 0])
        c[0] += passed
        c[1] += 1
    for op in sorted(per_op):
        p, t = per_op[op]
        print(f"  {op:<10} {p}/{t}")
    failures = [(r, m) for r, passed, m in results if not passed]
    total = len(results)
    print(f"{total} rows: {total - len(failures)} passed, {len(failures)} failed")
    shown = failures if args.verbose else failures[:25]
    for row, msg in shown:
        print(f"  FAIL {row.id}\n       {msg}")
    if len(failures) > len(shown):
        print(f"  ... {len(failures) - len(shown)} more (use -v)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
