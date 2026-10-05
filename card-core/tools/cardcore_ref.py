"""Card Core reference implementation (Python).

Behaviour is defined by SPEC.md and pinned by conformance/. This file is one
implementation of that contract, not the contract itself. Anything it does that
the suite does not pin is not normative.

Requires: jsonschema >= 4.18 (Draft 2020-12 and the referencing library).
"""
from __future__ import annotations

import copy
import datetime
import hashlib
import json
import re
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, validators
from jsonschema.exceptions import ValidationError
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012

PACK_KIND = "core.pack"
DEFAULTS_KIND = "core.defaults"
TOKEN_PREFIX = "$defaults."
UNSET = "$unset"
DATE_SHAPE = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}")
# SPEC.md section 10: dex-style statuses map onto the core status enum.
DEX_STATUS = {"active": "active", "deprecated": "deprecated", "experimental": "draft", "archived": "retired"}
# SPEC.md section 10: required fields, id source, original_kind source per dialect.
DIALECTS: dict[str, dict[str, Any]] = {
    "kind-id": {"required": [["id"], ["kind"]], "id": ["id"], "original_kind": ["kind"], "dex": False},
    "schema-string": {"required": [["schema"], ["id"]], "id": ["id"], "original_kind": ["schema"], "dex": False},
    "dex-card": {
        "required": [["dex_id"], ["dex_type"], ["module_id"]],
        "id": ["module_id"],
        "original_kind": ["dex_type"],
        "dex": True,
    },
    "dex-frontmatter": {
        "required": [["dex_id"], ["dex_type"], ["midi_2_0_context", "property_exchange_id"]],
        "id": ["midi_2_0_context", "property_exchange_id"],
        "original_kind": ["dex_type"],
        "dex": True,
        "strip": "urn:",
    },
}


def _ecma_pattern(pattern: str) -> str:
    """Translate an ASCII-subset ECMA-262 pattern to Python `re` syntax.

    SPEC.md section 4.1: `$` matches only at the very end of the string. Python
    lets `$` match before a final newline, so an unescaped `$` outside a
    character class becomes `\\Z`. Patterns are restricted to an ASCII subset
    (no `.`, `\\d`, `\\w`, `\\s`, lookarounds or flags), where the two
    dialects otherwise agree.
    """
    out: list[str] = []
    in_class = escaped = False
    for ch in pattern:
        if escaped:
            out.append(ch)
            escaped = False
        elif ch == "\\":
            out.append(ch)
            escaped = True
        elif in_class:
            out.append(ch)
            in_class = ch != "]"
        elif ch == "[":
            out.append(ch)
            in_class = True
        elif ch == "$":
            out.append("\\Z")
        else:
            out.append(ch)
    return "".join(out)


def _pattern_keyword(validator, pattern, instance, schema):
    if validator.is_type(instance, "string") and not re.search(_ecma_pattern(pattern), instance):
        yield ValidationError(f"{instance!r} does not match {pattern!r}")


# Draft 2020-12 with the SPEC.md section 4.1 `pattern` semantics.
CardValidator = validators.extend(Draft202012Validator, {"pattern": _pattern_keyword})


# SPEC.md section 5: equality is exact JSON equality. Python's `==` treats True as 1 and 1.0 as 1.
def _same(a: Any, b: Any) -> bool:
    if type(a) is not type(b):
        return False
    if isinstance(a, dict):
        return a.keys() == b.keys() and all(_same(a[k], b[k]) for k in a)
    if isinstance(a, list):
        return len(a) == len(b) and all(_same(x, y) for x, y in zip(a, b))
    return a == b


# SPEC.md section 10: only A to Z are lowercased. str.lower() would fold the Kelvin sign into `k`.
_ASCII_LOWER = {c: c + 32 for c in range(ord("A"), ord("Z") + 1)}


class _NonFinite(Exception):
    pass


_LONE_SURROGATE = re.compile("[\ud800-\udfff]")


def _ptr(tokens) -> str:
    # SPEC.md section 8: a pointer never contains a lone surrogate; it is written as U+FFFD.
    text = "".join("/" + str(t).replace("~", "~0").replace("/", "~1") for t in tokens)
    return _LONE_SURROGATE.sub("\ufffd", text)


def _e(code: str, tokens=()) -> dict:
    return {"code": code, "pointer": _ptr(tokens)}


def _fail(errors: list[dict]) -> dict:
    seen, out = set(), []
    for err in errors:
        key = (err["code"], err["pointer"])
        if key not in seen:
            seen.add(key)
            out.append({"code": err["code"], "pointer": err["pointer"]})
    out.sort(key=lambda x: (x["code"], x["pointer"]))
    return {"ok": False, "errors": out}


def _ok(output: Any = None) -> dict:
    return {"ok": True, "output": output}


def _flatten(err):
    yield err
    for sub in err.context or []:
        yield from _flatten(sub)


def _prefix(errors: list[dict], tokens) -> list[dict]:
    head = _ptr(tokens)
    return [{"code": e["code"], "pointer": head + e["pointer"]} for e in errors]


class Ref:
    def __init__(self, registry_paths, mutate=None):
        self.kinds: dict[tuple[str, int], dict] = {}
        self.schemas: dict[str, dict] = {}
        self.envelope_id: str | None = None
        self.class_ids: dict[str, str] = {}
        for idx_path in map(Path, registry_paths):
            idx = json.loads(idx_path.read_text(encoding="utf-8"))
            self.envelope_id = idx.get("envelope", self.envelope_id)
            self.class_ids.update(idx.get("classes", {}))
            for entry in idx["kinds"]:
                key = (entry["kind"], entry["schema_version"])
                if key in self.kinds:
                    raise ValueError(f"kind registered twice: {key}")
                self.kinds[key] = entry
            for path in sorted(idx_path.parent.rglob("*.json")):
                if path.name in ("index.json", "limits.json"):
                    continue
                schema = json.loads(path.read_text(encoding="utf-8"))
                # The dialect is fixed by CardValidator. A `$schema` key would make
                # jsonschema pick plain Draft 2020-12 again when it follows a `$ref`
                # to this resource, silently dropping the `pattern` semantics.
                schema.pop("$schema", None)
                self.schemas[schema["$id"]] = schema
        if mutate is not None:
            mutate(self.schemas)
        self.registry = Registry().with_resources(
            [(sid, Resource.from_contents(s, DRAFT202012)) for sid, s in self.schemas.items()]
        )
        self._validators: dict[str, Draft202012Validator] = {}
        if not self.envelope_id or "card" not in self.class_ids or "asset" not in self.class_ids:
            raise ValueError("registry must define envelope and classes")
        core = self._schema_by_suffix("/core.v1.json")["$defs"]
        self._dotted = re.compile(_ecma_pattern(core["dotted_key"]["pattern"]))
        self._id_re = re.compile(_ecma_pattern(core["id"]["pattern"]))
        self._id_max = core["id"].get("maxLength")
        order = self.schemas[self.envelope_id]["properties"]["visibility"]["enum"]
        self._rank = {v: len(order) - 1 - i for i, v in enumerate(order)}

    # ------------------------------------------------------------------ plumbing

    def _schema_by_suffix(self, suffix: str) -> dict:
        for sid, schema in self.schemas.items():
            if sid.endswith(suffix):
                return schema
        raise ValueError(f"schema not loaded: {suffix}")

    def _validator(self, sid: str) -> Draft202012Validator:
        if sid not in self._validators:
            self._validators[sid] = CardValidator(self.schemas[sid], registry=self.registry)
        return self._validators[sid]

    def _schema_errors(self, sid: str, instance: Any) -> list[dict]:
        out = []
        for err in self._validator(sid).iter_errors(instance):
            for leaf in _flatten(err):
                out.append(_e("E_SCHEMA", list(leaf.absolute_path)))
        return out

    def run(self, op: str, input: Any, base_dir: str | None, limits: dict) -> dict:
        if op == "lint":
            value, errors = self.lint_bytes(Path(input["raw_path"]).read_bytes(), limits)
            return _fail(errors) if errors else _ok()
        if op == "validate":
            return self.validate(input, base_dir, limits)
        if op == "resolve":
            return self.resolve(input, limits)
        if op == "freshness":
            return self.freshness(input, limits)
        if op == "adapt":
            return self.adapt(input, limits)
        if op == "unwrap":
            return self.unwrap(input)
        return _fail([_e("E_OP_UNKNOWN")])

    # ---------------------------------------------------------------------- lint

    def lint_bytes(self, data: bytes, limits: dict) -> tuple[Any, list[dict]]:
        if len(data) > limits["max_json_bytes"]:
            return None, [_e("E_TOO_LARGE")]
        if data.startswith(b"\xef\xbb\xbf"):
            return None, [_e("E_BOM")]
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            return None, [_e("E_ENCODING")]
        dup_map: dict[int, list[str]] = {}

        def hook(pairs):
            obj, dupes = {}, []
            for key, val in pairs:
                if key in obj:
                    dupes.append(key)
                obj[key] = val
            if dupes:
                dup_map[id(obj)] = dupes
            return obj

        def constant(name):
            raise _NonFinite(name)

        def parse_int(literal):
            # Python refuses integer literals over 4300 digits. SPEC.md section 5 reads them at
            # any length, and anything this long is out of range whatever the limit is.
            if len(literal.lstrip("-")) > 40:
                return -(limits["int_max"] + 1) if literal.startswith("-") else limits["int_max"] + 1
            return int(literal)

        try:
            value = json.loads(text, object_pairs_hook=hook, parse_constant=constant, parse_int=parse_int)
        except _NonFinite:
            return None, [_e("E_NONFINITE")]
        except RecursionError:
            return None, [_e("E_TOO_DEEP")]
        except json.JSONDecodeError:
            return None, [_e("E_PARSE")]
        except ValueError:
            return None, [_e("E_INT_RANGE")]
        errors = self.lint_value(value, limits, dup_map=dup_map)
        return (None, errors) if errors else (value, [])

    def lint_value(self, value: Any, limits: dict, prefix=(), dup_map=None) -> list[dict]:
        errors: list[dict] = []
        int_max, max_depth = limits["int_max"], limits["max_nesting_depth"]
        too_deep = [False]

        def bad_string(s: str) -> bool:
            return any(ord(c) == 0x7F or 0xD800 <= ord(c) <= 0xDFFF for c in s)

        def walk(node, path, depth):
            if isinstance(node, dict):
                depth += 1
                if depth > max_depth:
                    too_deep[0] = True
                    return
                for key in (dup_map or {}).get(id(node), []):
                    errors.append(_e("E_DUP_KEY", path + [key]))
                for key, val in node.items():
                    if not key.isascii():
                        errors.append(_e("E_KEY_NONASCII", path + [key]))
                    elif bad_string(key):
                        errors.append(_e("E_ENCODING", path + [key]))
                    walk(val, path + [key], depth)
            elif isinstance(node, list):
                depth += 1
                if depth > max_depth:
                    too_deep[0] = True
                    return
                for i, val in enumerate(node):
                    walk(val, path + [i], depth)
            elif isinstance(node, bool) or node is None:
                return
            elif isinstance(node, int):
                if abs(node) > int_max:
                    errors.append(_e("E_INT_RANGE", path))
            elif isinstance(node, float):
                errors.append(_e("E_FLOAT", path))
            elif isinstance(node, str) and bad_string(node):
                errors.append(_e("E_ENCODING", path))

        walk(value, list(prefix), 0)
        if too_deep[0]:
            errors.append(_e("E_TOO_DEEP", prefix))
        return errors

    # ------------------------------------------------------------------ validate

    def validate(self, card: Any, base_dir: str | None, limits: dict) -> dict:
        errors = self.lint_value(card, limits)
        if errors:
            return _fail(errors)
        errors = self._schema_errors(self.envelope_id, card)
        if errors:
            return _fail(errors)
        entry = self.kinds.get((card["kind"], card["schema_version"]))
        if entry is None:
            known = any(kind == card["kind"] for kind, _ in self.kinds)
            return _fail([_e("E_KIND_UNKNOWN", ["schema_version"] if known else ["kind"])])
        if entry["class"] == "card":
            is_open = "extends" in card or (
                entry.get("allow_tokens", True) and self._has_tokens(card.get("params"))
            )
            schema = self.class_ids["card"] if is_open else entry["schema"]
        else:
            schema = entry["schema"]
        errors = self._schema_errors(schema, card)
        if errors:
            return _fail(errors)
        errors = self._semantic(card)
        if errors:
            return _fail(errors)
        if card["kind"] == PACK_KIND and base_dir:
            errors = self._check_pack(card, Path(base_dir), limits)
            if errors:
                return _fail(errors)
        return _ok()

    def _has_tokens(self, node: Any) -> bool:
        if isinstance(node, dict):
            return any(k.startswith("$") or self._has_tokens(v) for k, v in node.items())
        if isinstance(node, list):
            return any(self._has_tokens(v) for v in node)
        return isinstance(node, str) and TOKEN_PREFIX in node

    @staticmethod
    def _real_date(text: Any) -> bool:
        if not isinstance(text, str) or not DATE_SHAPE.fullmatch(text):
            return False
        try:
            datetime.date.fromisoformat(text)
        except ValueError:
            return False
        return True

    def _semantic(self, card: dict) -> list[dict]:
        errors: list[dict] = []

        def walk(node, path):
            if isinstance(node, dict):
                for key, val in node.items():
                    walk(val, path + [key])
            elif isinstance(node, list):
                for i, val in enumerate(node):
                    walk(val, path + [i])
            elif isinstance(node, str) and DATE_SHAPE.fullmatch(node) and not self._real_date(node):
                errors.append(_e("E_DATE_INVALID", path))

        walk(card, [])
        if not errors:
            as_of, review_by = card.get("as_of"), card.get("review_by")
            if isinstance(as_of, str) and isinstance(review_by, str) and as_of > review_by:
                errors.append(_e("E_DATE_ORDER", ["as_of"]))
        return errors

    def _check_pack(self, card: dict, base: Path, limits: dict) -> list[dict]:
        entries = card["params"]["cards"]
        head = ["params", "cards"]
        errors: list[dict] = []
        ids: dict[str, int] = {}
        for i, entry in enumerate(entries):  # stage 1: unique ids
            if entry["id"] in ids:
                errors.append(_e("E_ID_DUP", head + [i, "id"]))
            ids.setdefault(entry["id"], i)
        if errors:
            return errors
        root = base.resolve()
        files: dict[int, Path] = {}
        for i, entry in enumerate(entries):  # stage 2: files exist and stay inside the pack
            path = (base / entry["path"]).resolve()
            if path.is_relative_to(root) and path.is_file():
                files[i] = path
            else:
                errors.append(_e("E_PACK_MISSING", head + [i, "path"]))
        if errors:
            return errors
        data = {i: p.read_bytes() for i, p in files.items()}
        for i, entry in enumerate(entries):  # stage 3: digests of the file bytes
            if "sha256:" + hashlib.sha256(data[i]).hexdigest() != entry["sha256"]:
                errors.append(_e("E_HASH_MISMATCH", head + [i, "sha256"]))
        if errors:
            return errors
        parsed: dict[int, Any] = {}
        lint_errors: dict[int, list[dict]] = {}
        for i in data:
            value, errs = self.lint_bytes(data[i], limits)
            if errs:
                lint_errors[i] = errs
            else:
                parsed[i] = value
        for i, value in parsed.items():  # stage 4: file envelope equals entry
            for field in ("id", "kind", "schema_version", "rev"):
                if not isinstance(value, dict) or not _same(value.get(field), entries[i][field]):
                    errors.append(_e("E_PACK_MISMATCH", head + [i]))
                    break
        if errors:
            return errors
        for i in sorted(set(lint_errors) | set(parsed)):  # stage 5: each file card validates
            if i in lint_errors:
                errors.extend(_prefix(lint_errors[i], head + [i]))
                continue
            result = self.validate(parsed[i], None, limits)
            if not result["ok"]:
                errors.extend(_prefix(result["errors"], head + [i]))
        if errors:
            return errors
        for i, value in parsed.items():  # stage 6: references stay inside the pack
            targets = [value.get("extends")] + [r.get("id") for r in value.get("refs", [])]
            if any(t is not None and t not in ids for t in targets):
                errors.append(_e("E_REF_MISSING", head + [i]))
        ref = card["params"].get("defaults_ref")
        if ref is not None and ref not in ids:
            errors.append(_e("E_REF_MISSING", ["params", "defaults_ref"]))
        return errors

    # ------------------------------------------------------------------- resolve

    def _chain(self, cards: dict, start: Any, limits: dict, start_ptr: list):
        """Return (chain root first as [(id, card)], errors)."""
        chain: list[tuple[str, dict]] = []
        seen: list[str] = []
        cur, prev, missing_ptr = start, None, start_ptr
        while True:
            if not isinstance(cur, str) or cur not in cards or not isinstance(cards[cur], dict):
                return [], [_e("E_REF_MISSING", missing_ptr)]
            if cur in seen:
                return [], [_e("E_EXTENDS_CYCLE", ["cards", prev, "extends"])]
            seen.append(cur)
            if len(seen) > limits["extends_max_depth"]:
                return [], [_e("E_EXTENDS_DEPTH", start_ptr)]
            card = cards[cur]
            if prev is not None:
                child = cards[prev]
                if not (_same(card.get("kind"), child.get("kind"))
                        and _same(card.get("schema_version"), child.get("schema_version"))):
                    return [], [_e("E_EXTENDS_KIND", ["cards", prev, "extends"])]
            chain.append((cur, card))
            parent = card.get("extends")
            if parent is None:
                break
            prev, cur, missing_ptr = cur, parent, ["cards", cur, "extends"]
        chain.reverse()
        return chain, []

    def _check_chain_cards(self, chain: list[tuple[str, dict]]) -> list[dict]:
        errors: list[dict] = []
        for cid, card in chain:
            errs = self._schema_errors(self.envelope_id, card)
            if errs:
                errors.extend(_prefix(errs, ["cards", cid]))
                continue
            entry = self.kinds.get((card["kind"], card["schema_version"]))
            if entry is None:
                known = any(kind == card["kind"] for kind, _ in self.kinds)
                errors.append(_e("E_KIND_UNKNOWN", ["cards", cid, "schema_version" if known else "kind"]))
                continue
            if entry["class"] != "card":
                errors.append(_e("E_SCHEMA", ["cards", cid, "kind"]))
                continue
            errs = self._schema_errors(self.class_ids["card"], card)
            if errs:
                errors.extend(_prefix(errs, ["cards", cid]))
        return errors

    def _ratchet(self, chain: list[tuple[str, dict]]) -> list[dict]:
        errors = []
        for i, (cid, card) in enumerate(chain):
            for _, ancestor in chain[:i]:
                if self._rank[card["visibility"]] > self._rank[ancestor["visibility"]]:
                    errors.append(_e("E_VISIBILITY_WIDEN", ["cards", cid, "visibility"]))
                    break
        return errors

    def _scan_dollar(self, node: Any, path: list, errors: list) -> None:
        if isinstance(node, dict):
            for key, val in node.items():
                if key.startswith("$"):
                    errors.append(_e("E_DOLLAR_KEY", path + [key]))
                self._scan_dollar(val, path + [key], errors)
        elif isinstance(node, list):
            for i, val in enumerate(node):
                self._scan_dollar(val, path + [i], errors)

    def _merge(self, base: dict, over: dict, ptr: list, has_parent: bool, tokens_ok: bool, errors: list) -> dict:
        out = copy.deepcopy(base)
        for key, val in over.items():
            here = ptr + [key]
            if tokens_ok and key.startswith("$"):
                errors.append(_e("E_DOLLAR_KEY", here))
                continue
            if tokens_ok and isinstance(val, dict) and UNSET in val:
                if len(val) == 1 and val[UNSET] is True:
                    if key in out:
                        del out[key]
                    else:
                        errors.append(_e("E_UNSET_MISSING" if has_parent else "E_UNSET_ORPHAN", here))
                else:
                    errors.append(_e("E_DOLLAR_KEY", here + [UNSET]))
                continue
            if isinstance(val, dict):
                sub = out.get(key) if isinstance(out.get(key), dict) else {}
                out[key] = self._merge(sub, val, here, has_parent, tokens_ok, errors)
            else:
                if tokens_ok:
                    self._scan_dollar(val, here, errors)
                out[key] = copy.deepcopy(val)
        return out

    def _merged_params(self, chain: list[tuple[str, dict]]) -> tuple[dict, list[dict]]:
        errors: list[dict] = []
        merged: dict = {}
        for i, (cid, card) in enumerate(chain):
            entry = self.kinds[(card["kind"], card["schema_version"])]
            merged = self._merge(merged, card["params"], ["cards", cid, "params"], i > 0,
                                 entry.get("allow_tokens", True), errors)
        return merged, errors

    def _resolve_defaults(self, cards: dict, defaults_id: Any, limits: dict):
        if defaults_id is None:
            return None, []
        if not isinstance(defaults_id, str) or not isinstance(cards.get(defaults_id), dict) \
                or cards[defaults_id].get("kind") != DEFAULTS_KIND:
            return None, [_e("E_DEFAULT_MISSING", ["defaults"])]
        chain, errors = self._chain(cards, defaults_id, limits, ["defaults"])
        if errors:
            return None, errors
        errors = self._check_chain_cards(chain) or self._ratchet(chain)
        if errors:
            return None, errors
        params, errors = self._merged_params(chain)
        if errors:
            return None, errors
        top = chain[-1][1]
        resolved = {k: v for k, v in top.items() if k != "extends"}
        resolved["params"] = params
        result = self.validate(resolved, None, limits)
        if not result["ok"]:
            return None, _prefix(result["errors"], ["defaults"])
        return {
            "id": top["id"],
            "rev": top["rev"],
            "lineage": [{"id": cid, "rev": c["rev"]} for cid, c in chain],
            "values": params["values"],
            "chain": chain,
        }, []

    def _substitute(self, node: Any, path: list, values, used: dict, errors: list) -> Any:
        if isinstance(node, dict):
            return {k: self._substitute(v, path + [k], values, used, errors) for k, v in node.items()}
        if isinstance(node, list):
            return [self._substitute(v, path + [i], values, used, errors) for i, v in enumerate(node)]
        if isinstance(node, str):
            if node.startswith(TOKEN_PREFIX):
                key = node[len(TOKEN_PREFIX):]
                if not self._dotted.fullmatch(key):
                    errors.append(_e("E_DEFAULT_PARTIAL", ["params"] + path))
                    return node
                if values is None or key not in values:
                    errors.append(_e("E_DEFAULT_MISSING", ["params"] + path))
                    return node
                used[key] = values[key]
                return copy.deepcopy(values[key])
            if TOKEN_PREFIX in node:
                errors.append(_e("E_DEFAULT_PARTIAL", ["params"] + path))
        return node

    def resolve(self, inp: Any, limits: dict) -> dict:
        if not isinstance(inp, dict) or not isinstance(inp.get("cards"), dict) or not isinstance(inp.get("target"), str):
            return _fail([_e("E_SCHEMA")])
        errors = self.lint_value(inp, limits)
        if errors:
            return _fail(errors)
        cards, target = inp["cards"], inp["target"]
        chain, errors = self._chain(cards, target, limits, ["target"])
        if errors:
            return _fail(errors)
        errors = self._check_chain_cards(chain)
        if errors:
            return _fail(errors)
        errors = self._ratchet(chain)
        if errors:
            return _fail(errors)
        merged, errors = self._merged_params(chain)
        if errors:
            return _fail(errors)
        info, errors = self._resolve_defaults(cards, inp.get("defaults"), limits)
        if errors:
            return _fail(errors)
        top = chain[-1][1]
        entry = self.kinds[(top["kind"], top["schema_version"])]
        used: dict = {}
        params = merged
        if entry.get("allow_tokens", True):
            params = self._substitute(merged, [], info["values"] if info else None, used, errors)
            if errors:
                return _fail(errors)
        if info and used:
            for _, ancestor in info["chain"]:
                if self._rank[top["visibility"]] > self._rank[ancestor["visibility"]]:
                    return _fail([_e("E_VISIBILITY_WIDEN", ["cards", top["id"], "visibility"])])
        resolved = {k: v for k, v in top.items() if k != "extends"}
        resolved["params"] = params
        result = self.validate(resolved, None, limits)
        if not result["ok"]:
            return result
        return _ok({
            "id": top["id"],
            "kind": top["kind"],
            "schema_version": top["schema_version"],
            "params": params,
            "lineage": [{"id": cid, "rev": c["rev"]} for cid, c in chain],
            "defaults": None if info is None else {
                "id": info["id"], "rev": info["rev"], "lineage": info["lineage"], "used": used,
            },
        })

    # ----------------------------------------------------------------- freshness

    def freshness(self, inp: Any, limits: dict) -> dict:
        if not isinstance(inp, dict):
            return _fail([_e("E_DATE_INVALID", ["as_of"])])
        errors = self.lint_value(inp, limits)
        if errors:
            return _fail(errors)
        as_of = inp.get("as_of")
        if not self._real_date(as_of):
            return _fail([_e("E_DATE_INVALID", ["as_of"])])
        card = inp.get("card")
        review_by = card.get("review_by") if isinstance(card, dict) else None
        if review_by is None:
            return _ok()
        if not self._real_date(review_by):
            return _fail([_e("E_DATE_INVALID", ["card", "review_by"])])
        if as_of > review_by:
            return _fail([_e("E_STALE", ["card", "review_by"])])
        return _ok()

    # --------------------------------------------------------------------- adapt

    @staticmethod
    def _get(obj: Any, path: list[str]) -> Any:
        for part in path:
            if not isinstance(obj, dict) or part not in obj:
                return None
            obj = obj[part]
        return obj

    def adapt(self, inp: Any, limits: dict) -> dict:
        if not isinstance(inp, dict):
            return _fail([_e("E_SCHEMA")])
        dialect = inp.get("dialect")
        spec = DIALECTS.get(dialect) if isinstance(dialect, str) else None
        if spec is None:
            return _fail([_e("E_ADAPT_DIALECT", ["dialect"])])
        legacy = inp.get("legacy")
        if not isinstance(legacy, dict):
            return _fail([_e("E_ADAPT_SHAPE", ["legacy"])])
        errors = self.lint_value(legacy, limits, prefix=["legacy"])
        if errors:
            return _fail(errors)
        errors = [_e("E_ADAPT_SHAPE", ["legacy"] + path) for path in spec["required"]
                  if not isinstance(self._get(legacy, path), str)]
        if errors:
            return _fail(errors)
        src_path = spec["id"]
        source = self._get(legacy, src_path)
        text = source
        if spec.get("strip") and text.startswith(spec["strip"]):
            text = text[len(spec["strip"]):]
        new_id = text.translate(_ASCII_LOWER).replace(":", ".")
        if (self._id_max is not None and len(new_id) > self._id_max) or not self._id_re.fullmatch(new_id):
            return _fail([_e("E_ADAPT_ID", ["legacy"] + src_path)])
        ctx = inp.get("context")
        if not isinstance(ctx, dict):
            return _fail([_e("E_ADAPT_CONTEXT", ["context"])])
        needed = ["owner", "visibility", "rev"]
        legacy_status = legacy.get("status") if spec["dex"] else None
        if legacy_status is None:
            needed.append("status")
        errors = [_e("E_ADAPT_CONTEXT", ["context", f]) for f in needed if f not in ctx]
        if errors:
            return _fail(errors)
        if legacy_status is not None:
            if not isinstance(legacy_status, str) or legacy_status not in DEX_STATUS:
                return _fail([_e("E_ADAPT_STATUS", ["legacy", "status"])])
            status = DEX_STATUS[legacy_status]
        else:
            status = ctx["status"]
        out: dict[str, Any] = {
            "schema_version": 1,
            "kind": "legacy.wrap",
            "id": new_id,
            "rev": ctx["rev"],
            "status": status,
            "visibility": ctx["visibility"],
            "owner": ctx["owner"],
            "params": {
                "dialect": dialect,
                "original_kind": self._get(legacy, spec["original_kind"]),
                "original": copy.deepcopy(legacy),
            },
        }
        aliases = [source] if source != new_id else []
        if spec["dex"]:
            aliases.append(legacy["dex_id"])
            dex = {"dex_id": legacy["dex_id"], "dex_type": legacy["dex_type"]}
            for extra in ("midi_2_0_context", "legacy_map"):
                if extra in legacy:
                    dex[extra] = copy.deepcopy(legacy[extra])
            out["ext"] = {"dex": dex}
            if "tags" in legacy:
                out["tags"] = copy.deepcopy(legacy["tags"])
        if aliases:
            out["aliases"] = aliases
        result = self.validate(out, None, limits)
        return _ok(out) if result["ok"] else result

    def unwrap(self, card: Any) -> dict:
        original = self._get(card, ["params", "original"])
        if not isinstance(card, dict) or card.get("kind") != "legacy.wrap" or not isinstance(original, dict):
            return _fail([_e("E_SCHEMA")])
        return _ok(copy.deepcopy(original))
