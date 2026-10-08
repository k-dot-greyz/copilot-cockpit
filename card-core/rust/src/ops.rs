//! The operations of SPEC.md section 8: validate, resolve, freshness and adapt.
//!
//! Each function mirrors one section of the specification. Failures are lists of [`Fault`];
//! the caller normalises them (sorted by code then pointer, repeats dropped).

use std::collections::{BTreeMap, HashMap};
use std::fs;
use std::path::Path;

use crate::Fault;
use crate::json::{Limits, V, fault, lint_bytes, lint_value, ptr, toks};
use crate::schema::{Class, Engine};

const PACK_KIND: &str = "core.pack";
const DEFAULTS_KIND: &str = "core.defaults";
const TOKEN_PREFIX: &str = "$defaults.";
const UNSET: &str = "$unset";

pub type Outcome = Result<V, Vec<Fault>>;

pub struct Ops<'a> {
    pub engine: &'a Engine,
    pub limits: Limits,
}

fn prefix_all(errors: Vec<Fault>, tokens: &[String]) -> Vec<Fault> {
    let head = ptr(tokens);
    errors.into_iter().map(|e| Fault { code: e.code, pointer: format!("{head}{}", e.pointer) }).collect()
}

fn s(parts: &[&str]) -> Vec<String> {
    toks(parts)
}

fn extend_path(base: &[String], more: &[&str]) -> Vec<String> {
    let mut out = base.to_vec();
    out.extend(more.iter().map(|p| p.to_string()));
    out
}

/// Dates are `NNNN-NN-NN` with ASCII digits (SPEC 5).
fn date_shaped(text: &str) -> bool {
    let b = text.as_bytes();
    b.len() == 10 && b.iter().enumerate().all(|(i, c)| if i == 4 || i == 7 { *c == b'-' } else { c.is_ascii_digit() })
}

fn real_date(value: Option<&V>) -> bool {
    let Some(V::Str(text)) = value else {
        return false;
    };
    if !date_shaped(text) {
        return false;
    }
    let year: u32 = text[0..4].parse().unwrap_or(0);
    let month: u32 = text[5..7].parse().unwrap_or(0);
    let day: u32 = text[8..10].parse().unwrap_or(0);
    if year == 0 || !(1..=12).contains(&month) || day == 0 {
        return false;
    }
    let leap = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
    let days = match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        _ => {
            if leap {
                29
            } else {
                28
            }
        }
    };
    day <= days
}

fn has_tokens(node: &V) -> bool {
    match node {
        V::Obj(map) => map.iter().any(|(k, v)| k.starts_with('$') || has_tokens(v)),
        V::Arr(items) => items.iter().any(has_tokens),
        V::Str(text) => text.contains(TOKEN_PREFIX),
        _ => false,
    }
}

struct ChainCard<'c> {
    id: String,
    card: &'c V,
}

struct DefaultsInfo<'c> {
    id: String,
    rev: V,
    lineage: V,
    values: BTreeMap<String, V>,
    chain: Vec<ChainCard<'c>>,
}

impl Ops<'_> {
    // ------------------------------------------------------------------------------ validate

    pub fn validate(&self, card: &V, base_dir: Option<&Path>) -> Result<(), Vec<Fault>> {
        let errors = lint_value(card, &self.limits, &[], &[]);
        if !errors.is_empty() {
            return Err(errors);
        }
        let engine = self.engine;
        let errors = engine.schema_errors(&engine.envelope_id, card);
        if !errors.is_empty() {
            return Err(errors);
        }
        let kind = card.get("kind").and_then(V::as_str).expect("envelope guarantees kind");
        let version = match card.get("schema_version") {
            Some(V::Int(i)) => *i,
            _ => panic!("envelope guarantees schema_version"),
        };
        let Some(entry) = engine.kind(kind, version) else {
            let pointer = if engine.kind_name_known(kind) { "schema_version" } else { "kind" };
            return Err(vec![fault("E_KIND_UNKNOWN", &s(&[pointer]))]);
        };
        let schema = match entry.class {
            Class::Card => {
                let open =
                    card.get("extends").is_some() || (entry.allow_tokens && card.get("params").is_some_and(has_tokens));
                if open { engine.card_class_id.clone() } else { entry.schema.clone() }
            }
            Class::Asset => entry.schema.clone(),
        };
        let errors = engine.schema_errors(&schema, card);
        if !errors.is_empty() {
            return Err(errors);
        }
        let errors = self.semantic(card);
        if !errors.is_empty() {
            return Err(errors);
        }
        if kind == PACK_KIND {
            if let Some(base) = base_dir {
                let errors = self.check_pack(card, base);
                if !errors.is_empty() {
                    return Err(errors);
                }
            }
        }
        Ok(())
    }

    fn semantic(&self, card: &V) -> Vec<Fault> {
        fn walk(node: &V, path: &mut Vec<String>, errors: &mut Vec<Fault>) {
            match node {
                V::Obj(map) => {
                    for (key, val) in map {
                        path.push(key.clone());
                        walk(val, path, errors);
                        path.pop();
                    }
                }
                V::Arr(items) => {
                    for (i, val) in items.iter().enumerate() {
                        path.push(i.to_string());
                        walk(val, path, errors);
                        path.pop();
                    }
                }
                V::Str(text) if date_shaped(text) && !real_date(Some(node)) => {
                    errors.push(fault("E_DATE_INVALID", path));
                }
                _ => {}
            }
        }
        let mut errors = Vec::new();
        walk(card, &mut Vec::new(), &mut errors);
        if errors.is_empty() {
            if let (Some(V::Str(as_of)), Some(V::Str(review_by))) = (card.get("as_of"), card.get("review_by")) {
                if as_of > review_by {
                    errors.push(fault("E_DATE_ORDER", &s(&["as_of"])));
                }
            }
        }
        errors
    }

    fn check_pack(&self, card: &V, base: &Path) -> Vec<Fault> {
        let entries: &[V] = match card.at(&["params", "cards"]) {
            Some(V::Arr(items)) => items,
            _ => panic!("pack schema guarantees params.cards"),
        };
        let head = s(&["params", "cards"]);
        let at = |i: usize, more: &[&str]| -> Vec<String> {
            let mut t = head.clone();
            t.push(i.to_string());
            t.extend(more.iter().map(|m| m.to_string()));
            t
        };
        let entry_str =
            |i: usize, key: &str| -> String { entries[i].get(key).and_then(V::as_str).unwrap_or_default().to_string() };

        // Stage 1: unique ids.
        let mut errors = Vec::new();
        let mut ids: HashMap<String, usize> = HashMap::new();
        for i in 0..entries.len() {
            let id = entry_str(i, "id");
            if ids.contains_key(&id) {
                errors.push(fault("E_ID_DUP", &at(i, &["id"])));
            }
            ids.entry(id).or_insert(i);
        }
        if !errors.is_empty() {
            return errors;
        }

        // Stage 2: every file exists and stays inside the pack directory.
        let root = fs::canonicalize(base).unwrap_or_else(|_| base.to_path_buf());
        let mut data: Vec<Vec<u8>> = Vec::new();
        for i in 0..entries.len() {
            let path = fs::canonicalize(base.join(entry_str(i, "path"))).ok();
            match path.filter(|p| p.starts_with(&root) && p.is_file()) {
                Some(p) => match fs::read(&p) {
                    Ok(bytes) => data.push(bytes),
                    Err(_) => errors.push(fault("E_PACK_MISSING", &at(i, &["path"]))),
                },
                None => errors.push(fault("E_PACK_MISSING", &at(i, &["path"]))),
            }
        }
        if !errors.is_empty() {
            return errors;
        }

        // Stage 3: digests of the file bytes.
        for (i, bytes) in data.iter().enumerate() {
            let want = entry_str(i, "sha256");
            if crate::sha256_label(bytes) != want {
                errors.push(fault("E_HASH_MISMATCH", &at(i, &["sha256"])));
            }
        }
        if !errors.is_empty() {
            return errors;
        }

        let mut parsed: BTreeMap<usize, V> = BTreeMap::new();
        let mut lint_errors: BTreeMap<usize, Vec<Fault>> = BTreeMap::new();
        for (i, bytes) in data.iter().enumerate() {
            match lint_bytes(bytes, &self.limits) {
                Ok(value) => {
                    parsed.insert(i, value);
                }
                Err(errs) => {
                    lint_errors.insert(i, errs);
                }
            }
        }

        // Stage 4: the file's envelope equals the entry. Equality is strict: `true` is not 1.
        for (i, value) in &parsed {
            let same = ["id", "kind", "schema_version", "rev"]
                .iter()
                .all(|field| value.is_obj() && value.get(field) == entries[*i].get(field));
            if !same {
                errors.push(fault("E_PACK_MISMATCH", &at(*i, &[])));
            }
        }
        if !errors.is_empty() {
            return errors;
        }

        // Stage 5: each file card passes validate; errors keep their codes, pointers are prefixed.
        let mut every: Vec<usize> = lint_errors.keys().chain(parsed.keys()).copied().collect();
        every.sort_unstable();
        every.dedup();
        for i in every {
            if let Some(errs) = lint_errors.remove(&i) {
                errors.extend(prefix_all(errs, &at(i, &[])));
                continue;
            }
            if let Err(errs) = self.validate(&parsed[&i], None) {
                errors.extend(prefix_all(errs, &at(i, &[])));
            }
        }
        if !errors.is_empty() {
            return errors;
        }

        // Stage 6: references stay inside the pack.
        for (i, value) in &parsed {
            let mut targets: Vec<Option<&V>> = vec![value.get("extends")];
            if let Some(V::Arr(refs)) = value.get("refs") {
                targets.extend(refs.iter().map(|r| r.get("id")));
            }
            let dangling = targets.into_iter().flatten().any(|t| match t {
                V::Null => false,
                V::Str(id) => !ids.contains_key(id),
                _ => true,
            });
            if dangling {
                errors.push(fault("E_REF_MISSING", &at(*i, &[])));
            }
        }
        if let Some(V::Str(id)) = card.at(&["params", "defaults_ref"]) {
            if !ids.contains_key(id) {
                errors.push(fault("E_REF_MISSING", &s(&["params", "defaults_ref"])));
            }
        }
        errors
    }

    // ------------------------------------------------------------------------------- resolve

    fn chain<'c>(
        &self,
        cards: &'c BTreeMap<String, V>,
        start: Option<&V>,
        start_ptr: &[String],
    ) -> Result<Vec<ChainCard<'c>>, Vec<Fault>> {
        let mut chain: Vec<ChainCard<'c>> = Vec::new();
        let mut seen: Vec<String> = Vec::new();
        let mut cur: Option<&V> = start;
        let mut prev: Option<String> = None;
        let mut missing_ptr = start_ptr.to_vec();
        loop {
            let found = cur.and_then(V::as_str).and_then(|id| cards.get(id).filter(|c| c.is_obj()).map(|c| (id, c)));
            let Some((id, card)) = found else {
                return Err(vec![fault("E_REF_MISSING", &missing_ptr)]);
            };
            if seen.iter().any(|x| x == id) {
                let prev = prev.as_deref().unwrap_or_default();
                return Err(vec![fault("E_EXTENDS_CYCLE", &s(&["cards", prev, "extends"]))]);
            }
            seen.push(id.to_string());
            if seen.len() > self.limits.extends_max_depth {
                return Err(vec![fault("E_EXTENDS_DEPTH", start_ptr)]);
            }
            if let Some(prev_id) = &prev {
                let child = &cards[prev_id.as_str()];
                if (card.get("kind"), card.get("schema_version")) != (child.get("kind"), child.get("schema_version")) {
                    return Err(vec![fault("E_EXTENDS_KIND", &s(&["cards", prev_id, "extends"]))]);
                }
            }
            chain.push(ChainCard { id: id.to_string(), card });
            match card.get("extends") {
                None | Some(V::Null) => break,
                Some(parent) => {
                    missing_ptr = s(&["cards", id, "extends"]);
                    prev = Some(id.to_string());
                    cur = Some(parent);
                }
            }
        }
        chain.reverse();
        Ok(chain)
    }

    fn check_chain_cards(&self, chain: &[ChainCard<'_>]) -> Vec<Fault> {
        let engine = self.engine;
        let mut errors = Vec::new();
        for link in chain {
            let head = s(&["cards", &link.id]);
            let errs = engine.schema_errors(&engine.envelope_id, link.card);
            if !errs.is_empty() {
                errors.extend(prefix_all(errs, &head));
                continue;
            }
            if link.card.get("id").and_then(V::as_str) != Some(link.id.as_str()) {
                errors.push(fault("E_ID_MISMATCH", &extend_path(&head, &["id"])));
                continue;
            }
            let kind = link.card.get("kind").and_then(V::as_str).expect("envelope guarantees kind");
            let version = match link.card.get("schema_version") {
                Some(V::Int(i)) => *i,
                _ => panic!("envelope guarantees schema_version"),
            };
            let Some(entry) = engine.kind(kind, version) else {
                let pointer = if engine.kind_name_known(kind) { "schema_version" } else { "kind" };
                errors.push(fault("E_KIND_UNKNOWN", &extend_path(&head, &[pointer])));
                continue;
            };
            if entry.class != Class::Card {
                errors.push(fault("E_SCHEMA", &extend_path(&head, &["kind"])));
                continue;
            }
            let errs = engine.schema_errors(&engine.card_class_id, link.card);
            errors.extend(prefix_all(errs, &head));
        }
        errors
    }

    fn visibility_rank(&self, card: &V) -> usize {
        let name = card.get("visibility").and_then(V::as_str).expect("envelope guarantees visibility");
        *self.engine.rank.get(name).expect("envelope enumerates visibility")
    }

    fn ratchet(&self, chain: &[ChainCard<'_>]) -> Vec<Fault> {
        let mut errors = Vec::new();
        for (i, link) in chain.iter().enumerate() {
            let rank = self.visibility_rank(link.card);
            if chain[..i].iter().any(|ancestor| rank > self.visibility_rank(ancestor.card)) {
                errors.push(fault("E_VISIBILITY_WIDEN", &s(&["cards", &link.id, "visibility"])));
            }
        }
        errors
    }

    fn scan_dollar(node: &V, path: &mut Vec<String>, errors: &mut Vec<Fault>) {
        match node {
            V::Obj(map) => {
                for (key, val) in map {
                    path.push(key.clone());
                    if key.starts_with('$') {
                        errors.push(fault("E_DOLLAR_KEY", path));
                    }
                    Self::scan_dollar(val, path, errors);
                    path.pop();
                }
            }
            V::Arr(items) => {
                for (i, val) in items.iter().enumerate() {
                    path.push(i.to_string());
                    Self::scan_dollar(val, path, errors);
                    path.pop();
                }
            }
            _ => {}
        }
    }

    #[allow(clippy::too_many_arguments)]
    fn merge(
        base: &BTreeMap<String, V>,
        over: &BTreeMap<String, V>,
        path: &mut Vec<String>,
        has_parent: bool,
        tokens_ok: bool,
        errors: &mut Vec<Fault>,
    ) -> BTreeMap<String, V> {
        let mut out = base.clone();
        for (key, val) in over {
            path.push(key.clone());
            let mut handled = false;
            if tokens_ok && key.starts_with('$') {
                errors.push(fault("E_DOLLAR_KEY", path));
                handled = true;
            } else if tokens_ok {
                if let V::Obj(marker) = val {
                    if marker.contains_key(UNSET) {
                        handled = true;
                        if marker.len() == 1 && marker.get(UNSET) == Some(&V::Bool(true)) {
                            if out.remove(key).is_none() {
                                let code = if has_parent { "E_UNSET_MISSING" } else { "E_UNSET_ORPHAN" };
                                errors.push(fault(code, path));
                            }
                        } else {
                            path.push(UNSET.to_string());
                            errors.push(fault("E_DOLLAR_KEY", path));
                            path.pop();
                        }
                    }
                }
            }
            if !handled {
                if let V::Obj(inner) = val {
                    let sub = match out.get(key) {
                        Some(V::Obj(existing)) => existing.clone(),
                        _ => BTreeMap::new(),
                    };
                    out.insert(key.clone(), V::Obj(Self::merge(&sub, inner, path, has_parent, tokens_ok, errors)));
                } else {
                    if tokens_ok {
                        Self::scan_dollar(val, path, errors);
                    }
                    out.insert(key.clone(), val.clone());
                }
            }
            path.pop();
        }
        out
    }

    fn merged_params(&self, chain: &[ChainCard<'_>]) -> Result<BTreeMap<String, V>, Vec<Fault>> {
        let mut errors = Vec::new();
        let mut merged: BTreeMap<String, V> = BTreeMap::new();
        for (i, link) in chain.iter().enumerate() {
            let kind = link.card.get("kind").and_then(V::as_str).expect("checked");
            let version = match link.card.get("schema_version") {
                Some(V::Int(v)) => *v,
                _ => panic!("checked"),
            };
            let allow_tokens = self.engine.kind(kind, version).expect("checked").allow_tokens;
            let params = match link.card.get("params") {
                Some(V::Obj(p)) => p,
                _ => panic!("card schema guarantees params"),
            };
            let mut path = s(&["cards", &link.id, "params"]);
            merged = Self::merge(&merged, params, &mut path, i > 0, allow_tokens, &mut errors);
        }
        if errors.is_empty() { Ok(merged) } else { Err(errors) }
    }

    fn lineage(chain: &[ChainCard<'_>]) -> V {
        V::Arr(
            chain
                .iter()
                .map(|l| V::obj([("id", V::Str(l.id.clone())), ("rev", l.card.get("rev").cloned().unwrap_or(V::Null))]))
                .collect(),
        )
    }

    fn resolve_defaults<'c>(
        &self,
        cards: &'c BTreeMap<String, V>,
        defaults_id: Option<&V>,
    ) -> Result<Option<DefaultsInfo<'c>>, Vec<Fault>> {
        let Some(id_value) = defaults_id.filter(|v| **v != V::Null) else {
            return Ok(None);
        };
        let usable = id_value
            .as_str()
            .and_then(|id| cards.get(id))
            .is_some_and(|c| c.is_obj() && c.get("kind").and_then(V::as_str) == Some(DEFAULTS_KIND));
        if !usable {
            return Err(vec![fault("E_DEFAULT_MISSING", &s(&["defaults"]))]);
        }
        let chain = self.chain(cards, Some(id_value), &s(&["defaults"]))?;
        let mut errors = self.check_chain_cards(&chain);
        if errors.is_empty() {
            errors = self.ratchet(&chain);
        }
        if !errors.is_empty() {
            return Err(errors);
        }
        let params = self.merged_params(&chain)?;
        let top = chain.last().expect("chain is never empty").card;
        let mut resolved = top.as_obj().expect("chain cards are objects").clone();
        resolved.remove("extends");
        resolved.insert("params".to_string(), V::Obj(params.clone()));
        if let Err(errs) = self.validate(&V::Obj(resolved), None) {
            return Err(prefix_all(errs, &s(&["defaults"])));
        }
        let values = match params.get("values") {
            Some(V::Obj(values)) => values.clone(),
            _ => panic!("defaults schema guarantees params.values"),
        };
        Ok(Some(DefaultsInfo {
            id: chain.last().expect("non-empty").id.clone(),
            rev: top.get("rev").cloned().unwrap_or(V::Null),
            lineage: Self::lineage(&chain),
            values,
            chain,
        }))
    }

    fn substitute(
        &self,
        node: &V,
        path: &mut Vec<String>,
        values: Option<&BTreeMap<String, V>>,
        used: &mut BTreeMap<String, V>,
        errors: &mut Vec<Fault>,
    ) -> V {
        let at = |path: &[String]| extend_path(&s(&["params"]), &path.iter().map(String::as_str).collect::<Vec<_>>());
        match node {
            V::Obj(map) => V::Obj(
                map.iter()
                    .map(|(k, v)| {
                        path.push(k.clone());
                        let out = self.substitute(v, path, values, used, errors);
                        path.pop();
                        (k.clone(), out)
                    })
                    .collect(),
            ),
            V::Arr(items) => V::Arr(
                items
                    .iter()
                    .enumerate()
                    .map(|(i, v)| {
                        path.push(i.to_string());
                        let out = self.substitute(v, path, values, used, errors);
                        path.pop();
                        out
                    })
                    .collect(),
            ),
            V::Str(text) => {
                if let Some(key) = text.strip_prefix(TOKEN_PREFIX) {
                    if !self.engine.dotted.is_match(key) {
                        errors.push(fault("E_DEFAULT_PARTIAL", &at(path)));
                        return node.clone();
                    }
                    match values.and_then(|v| v.get(key)) {
                        Some(value) => {
                            used.insert(key.to_string(), value.clone());
                            value.clone()
                        }
                        None => {
                            errors.push(fault("E_DEFAULT_MISSING", &at(path)));
                            node.clone()
                        }
                    }
                } else {
                    if text.contains(TOKEN_PREFIX) {
                        errors.push(fault("E_DEFAULT_PARTIAL", &at(path)));
                    }
                    node.clone()
                }
            }
            other => other.clone(),
        }
    }

    pub fn resolve(&self, input: &V) -> Outcome {
        let (Some(V::Obj(cards)), Some(target)) = (input.get("cards"), input.get("target").and_then(V::as_str)) else {
            return Err(vec![fault("E_SCHEMA", &[])]);
        };
        let errors = lint_value(input, &self.limits, &[], &[]);
        if !errors.is_empty() {
            return Err(errors);
        }
        let target_value = V::Str(target.to_string());
        let chain = self.chain(cards, Some(&target_value), &s(&["target"]))?;
        let errors = self.check_chain_cards(&chain);
        if !errors.is_empty() {
            return Err(errors);
        }
        let errors = self.ratchet(&chain);
        if !errors.is_empty() {
            return Err(errors);
        }
        let merged = self.merged_params(&chain)?;
        let info = self.resolve_defaults(cards, input.get("defaults"))?;
        let top_link = chain.last().expect("chain is never empty");
        let top = top_link.card;
        let kind = top.get("kind").and_then(V::as_str).expect("checked");
        let version = match top.get("schema_version") {
            Some(V::Int(v)) => *v,
            _ => panic!("checked"),
        };
        let allow_tokens = self.engine.kind(kind, version).expect("checked").allow_tokens;
        let mut used: BTreeMap<String, V> = BTreeMap::new();
        let mut params = V::Obj(merged);
        if allow_tokens {
            let mut errors = Vec::new();
            params =
                self.substitute(&params, &mut Vec::new(), info.as_ref().map(|i| &i.values), &mut used, &mut errors);
            if !errors.is_empty() {
                return Err(errors);
            }
        }
        if let Some(info) = &info {
            if !used.is_empty() {
                let rank = self.visibility_rank(top);
                if info.chain.iter().any(|ancestor| rank > self.visibility_rank(ancestor.card)) {
                    return Err(vec![fault("E_VISIBILITY_WIDEN", &s(&["cards", &top_link.id, "visibility"]))]);
                }
            }
        }
        let mut resolved = top.as_obj().expect("chain cards are objects").clone();
        resolved.remove("extends");
        resolved.insert("params".to_string(), params.clone());
        self.validate(&V::Obj(resolved), None)?;
        let defaults = match info {
            None => V::Null,
            Some(info) => {
                V::obj([("id", V::Str(info.id)), ("rev", info.rev), ("lineage", info.lineage), ("used", V::Obj(used))])
            }
        };
        Ok(V::obj([
            ("id", V::Str(top_link.id.clone())),
            ("kind", V::Str(kind.to_string())),
            ("schema_version", V::Int(version)),
            ("params", params),
            ("lineage", Self::lineage(&chain)),
            ("defaults", defaults),
        ]))
    }

    // ----------------------------------------------------------------------------- freshness

    pub fn freshness(&self, input: &V) -> Outcome {
        if !input.is_obj() {
            return Err(vec![fault("E_DATE_INVALID", &s(&["as_of"]))]);
        }
        let errors = lint_value(input, &self.limits, &[], &[]);
        if !errors.is_empty() {
            return Err(errors);
        }
        let as_of = input.get("as_of");
        if !real_date(as_of) {
            return Err(vec![fault("E_DATE_INVALID", &s(&["as_of"]))]);
        }
        let review_by = input.get("card").and_then(|c| c.get("review_by"));
        let review_by = match review_by {
            None | Some(V::Null) => return Ok(V::Null),
            Some(v) => v,
        };
        if !real_date(Some(review_by)) {
            return Err(vec![fault("E_DATE_INVALID", &s(&["card", "review_by"]))]);
        }
        if as_of.and_then(V::as_str) > review_by.as_str() {
            return Err(vec![fault("E_STALE", &s(&["card", "review_by"]))]);
        }
        Ok(V::Null)
    }

    // ---------------------------------------------------------------------------------- adapt

    pub fn adapt(&self, input: &V) -> Outcome {
        if !input.is_obj() {
            return Err(vec![fault("E_SCHEMA", &[])]);
        }
        let dialect_name = input.get("dialect").and_then(V::as_str);
        let Some(dialect) = dialect_name.and_then(Dialect::named) else {
            return Err(vec![fault("E_ADAPT_DIALECT", &s(&["dialect"]))]);
        };
        let Some(legacy) = input.get("legacy").filter(|l| l.is_obj()) else {
            return Err(vec![fault("E_ADAPT_SHAPE", &s(&["legacy"]))]);
        };
        let errors = lint_value(legacy, &self.limits, &s(&["legacy"]), &[]);
        if !errors.is_empty() {
            return Err(errors);
        }
        let errors: Vec<Fault> = dialect
            .required
            .iter()
            .filter(|path| !matches!(legacy.at(path), Some(V::Str(_))))
            .map(|path| fault("E_ADAPT_SHAPE", &extend_path(&s(&["legacy"]), path)))
            .collect();
        if !errors.is_empty() {
            return Err(errors);
        }
        let source = legacy.at(dialect.id).and_then(V::as_str).expect("required fields are strings");
        let text = match dialect.strip {
            Some(prefix) => source.strip_prefix(prefix).unwrap_or(source),
            None => source,
        };
        let new_id = text.to_ascii_lowercase().replace(':', ".");
        let too_long = self.engine.id_max.is_some_and(|max| new_id.chars().count() > max);
        if too_long || !self.engine.id_re.is_match(&new_id) {
            return Err(vec![fault("E_ADAPT_ID", &extend_path(&s(&["legacy"]), dialect.id))]);
        }
        let Some(V::Obj(ctx)) = input.get("context") else {
            return Err(vec![fault("E_ADAPT_CONTEXT", &s(&["context"]))]);
        };
        let legacy_status = if dialect.dex { legacy.get("status").filter(|v| **v != V::Null) } else { None };
        let mut needed = vec!["owner", "visibility", "rev"];
        if legacy_status.is_none() {
            needed.push("status");
        }
        let errors: Vec<Fault> = needed
            .iter()
            .filter(|field| !ctx.contains_key(**field))
            .map(|field| fault("E_ADAPT_CONTEXT", &s(&["context", field])))
            .collect();
        if !errors.is_empty() {
            return Err(errors);
        }
        let status = match legacy_status {
            Some(V::Str(name)) => match DEX_STATUS.iter().find(|(from, _)| from == name) {
                Some((_, to)) => V::str(to),
                None => return Err(vec![fault("E_ADAPT_STATUS", &s(&["legacy", "status"]))]),
            },
            Some(_) => return Err(vec![fault("E_ADAPT_STATUS", &s(&["legacy", "status"]))]),
            None => ctx["status"].clone(),
        };
        let mut out: BTreeMap<String, V> = BTreeMap::new();
        let mut put = |key: &str, value: V| {
            out.insert(key.to_string(), value);
        };
        put("schema_version", V::Int(1));
        put("kind", V::str("legacy.wrap"));
        put("id", V::Str(new_id.clone()));
        put("rev", ctx["rev"].clone());
        put("status", status);
        put("visibility", ctx["visibility"].clone());
        put("owner", ctx["owner"].clone());
        put(
            "params",
            V::obj([
                ("dialect", V::str(dialect.name)),
                ("original_kind", legacy.at(dialect.original_kind).cloned().unwrap_or(V::Null)),
                ("original", legacy.clone()),
            ]),
        );
        let mut aliases: Vec<V> = Vec::new();
        if source != new_id {
            aliases.push(V::str(source));
        }
        if dialect.dex {
            let dex_id = legacy.get("dex_id").cloned().expect("required");
            aliases.push(dex_id.clone());
            let mut dex = BTreeMap::new();
            dex.insert("dex_id".to_string(), dex_id);
            dex.insert("dex_type".to_string(), legacy.get("dex_type").cloned().expect("required"));
            for extra in ["midi_2_0_context", "legacy_map"] {
                if let Some(v) = legacy.get(extra) {
                    dex.insert(extra.to_string(), v.clone());
                }
            }
            put("ext", V::obj([("dex", V::Obj(dex))]));
            if let Some(tags) = legacy.get("tags") {
                put("tags", tags.clone());
            }
        }
        if !aliases.is_empty() {
            put("aliases", V::Arr(aliases));
        }
        let card = V::Obj(out);
        self.validate(&card, None)?;
        Ok(card)
    }

    pub fn unwrap(&self, card: &V) -> Outcome {
        let original = card.at(&["params", "original"]);
        match original {
            Some(o @ V::Obj(_)) if card.get("kind").and_then(V::as_str) == Some("legacy.wrap") => Ok(o.clone()),
            _ => Err(vec![fault("E_SCHEMA", &[])]),
        }
    }
}

/// SPEC 10: dex-style statuses map onto the core status enum.
const DEX_STATUS: [(&str, &str); 4] =
    [("active", "active"), ("deprecated", "deprecated"), ("experimental", "draft"), ("archived", "retired")];

/// SPEC 10: required fields, id source and original-kind source per dialect.
struct Dialect {
    name: &'static str,
    required: &'static [&'static [&'static str]],
    id: &'static [&'static str],
    original_kind: &'static [&'static str],
    dex: bool,
    strip: Option<&'static str>,
}

impl Dialect {
    fn named(name: &str) -> Option<&'static Dialect> {
        DIALECTS.iter().find(|d| d.name == name)
    }
}

static DIALECTS: [Dialect; 4] = [
    Dialect {
        name: "kind-id",
        required: &[&["id"], &["kind"]],
        id: &["id"],
        original_kind: &["kind"],
        dex: false,
        strip: None,
    },
    Dialect {
        name: "schema-string",
        required: &[&["schema"], &["id"]],
        id: &["id"],
        original_kind: &["schema"],
        dex: false,
        strip: None,
    },
    Dialect {
        name: "dex-card",
        required: &[&["dex_id"], &["dex_type"], &["module_id"]],
        id: &["module_id"],
        original_kind: &["dex_type"],
        dex: true,
        strip: None,
    },
    Dialect {
        name: "dex-frontmatter",
        required: &[&["dex_id"], &["dex_type"], &["midi_2_0_context", "property_exchange_id"]],
        id: &["midi_2_0_context", "property_exchange_id"],
        original_kind: &["dex_type"],
        dex: true,
        strip: Some("urn:"),
    },
];
