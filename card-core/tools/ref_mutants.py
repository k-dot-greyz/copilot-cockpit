"""Source-level mutants of cardcore_ref.py for `run_conformance.py --selftest`.

Each entry is (name, old snippet, new snippet). The harness applies the edit to the
reference implementation's source and runs the whole suite against the result. A
mutant that leaves every row green is a behaviour the fixtures do not pin, so the
suite fails its own selftest. A snippet that no longer matches the source is an
error too, so a stale mutant cannot pass quietly.

Not mutated on purpose: the path-escape guard in pack validation. The path grammar
rejects every escaping path before that guard runs, so no input can reach it.
"""

MUTANTS = [
    ("freshness: review_by exclusive", '        if as_of > review_by:\n            return _fail([_e("E_STALE"',
     '        if as_of >= review_by:\n            return _fail([_e("E_STALE"'),
    ("date order check off", 'and as_of > review_by:\n                errors.append(_e("E_DATE_ORDER"',
     'and False:\n                errors.append(_e("E_DATE_ORDER"'),
    ("floats accepted", 'errors.append(_e("E_FLOAT", path))', "pass"),
    ("duplicate keys accepted", "            if dupes:\n                dup_map[id(obj)] = dupes",
     "            if False:\n                dup_map[id(obj)] = dupes"),
    ("nesting limit off by one", "if depth > max_depth:", "if depth >= max_depth:"),
    ("integer range unchecked", "                if abs(node) > int_max:", "                if False:"),
    ("non-ASCII keys accepted", "                    if not key.isascii():", "                    if False:"),
    ("byte-order mark accepted", r'        if data.startswith(b"\xef\xbb\xbf"):', "        if False:"),
    ("size limit unchecked", '        if len(data) > limits["max_json_bytes"]:', "        if False:"),
    ("open-card detection off", '            is_open = "extends" in card or (', "            is_open = False and ("),
    ("allow_tokens ignored", 'entry.get("allow_tokens", True) and self._has_tokens(card.get("params"))',
     'self._has_tokens(card.get("params"))'),
    ("kind-unknown pointers swapped", '["schema_version"] if known else ["kind"]', '["kind"] if known else ["schema_version"]'),
    ("pack digest unchecked", '            if "sha256:" + hashlib.sha256(data[i]).hexdigest() != entry["sha256"]:', "            if False:"),
    ("pack duplicate ids accepted", '            if entry["id"] in ids:\n                errors.append(_e("E_ID_DUP"',
     '            if False:\n                errors.append(_e("E_ID_DUP"'),
    ("pack missing file accepted", "            if path.is_relative_to(root) and path.is_file():", "            if path.is_relative_to(root):"),
    ("extends kind check off",
     '                if (card.get("kind"), card.get("schema_version")) != (child.get("kind"), child.get("schema_version")):',
     "                if False:"),
    ("cycle detection off", '            if cur in seen:\n                return [], [_e("E_EXTENDS_CYCLE"',
     '            if False:\n                return [], [_e("E_EXTENDS_CYCLE"'),
    ("chain card envelope unchecked", '            errs = self._schema_errors(self.envelope_id, card)\n            if errs:\n                errors.extend(_prefix(errs, ["cards", cid]))',
     '            errs = []\n            if errs:\n                errors.extend(_prefix(errs, ["cards", cid]))'),
    ("chain card kind unchecked", '            if entry is None:\n                known = any(kind == card["kind"] for kind, _ in self.kinds)\n                errors.append(_e("E_KIND_UNKNOWN", ["cards", cid,',
     '            if False:\n                known = any(kind == card["kind"] for kind, _ in self.kinds)\n                errors.append(_e("E_KIND_UNKNOWN", ["cards", cid,'),
    ("visibility ratchet off", '                if self._rank[card["visibility"]] > self._rank[ancestor["visibility"]]:', "                if False:"),
    ("defaults visibility ratchet off", '                if self._rank[top["visibility"]] > self._rank[ancestor["visibility"]]:', "                if False:"),
    ("defaults ratchet applied when nothing used", "        if info and used:", "        if info:"),
    ("arrays concatenated", "                out[key] = copy.deepcopy(val)\n        return out",
     "                out[key] = (out[key] + copy.deepcopy(val)) if isinstance(val, list) and isinstance(out.get(key), list) else copy.deepcopy(val)\n        return out"),
    ("$unset ignored", "                    if key in out:\n                        del out[key]", "                    if key in out:\n                        pass"),
    ("orphan and missing swapped", 'errors.append(_e("E_UNSET_MISSING" if has_parent else "E_UNSET_ORPHAN", here))',
     'errors.append(_e("E_UNSET_ORPHAN" if has_parent else "E_UNSET_MISSING", here))'),
    ("defaults lose their type", "                return copy.deepcopy(values[key])", "                return str(values[key])"),
    ("partial tokens accepted", '            if TOKEN_PREFIX in node:\n                errors.append(_e("E_DEFAULT_PARTIAL", ["params"] + path))',
     '            if False:\n                errors.append(_e("E_DEFAULT_PARTIAL", ["params"] + path))'),
    ("defaults card not validated", '        if not result["ok"]:\n            return None, _prefix(result["errors"], ["defaults"])',
     '        if False:\n            return None, _prefix(result["errors"], ["defaults"])'),
    ("legacy status does not win", "            status = DEX_STATUS[legacy_status]", '            status = ctx.get("status", DEX_STATUS[legacy_status])'),
    ("aliases dropped", '        if aliases:\n            out["aliases"] = aliases', '        if False:\n            out["aliases"] = aliases'),
    ("ids not lowercased", '        new_id = text.lower().replace(":", ".")', '        new_id = text.replace(":", ".")'),
    ("adapter id length unchecked", "        if (self._id_max is not None and len(new_id) > self._id_max) or not self._id_re.fullmatch(new_id):",
     "        if not self._id_re.fullmatch(new_id):"),
    ("unwrap loses data", "        return _ok(copy.deepcopy(original))", '        return _ok({k: v for k, v in original.items() if k != "tags"})'),
]
