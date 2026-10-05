//! Kind registry and JSON Schema validation (SPEC.md sections 6, 8.2).
//!
//! Schemas are loaded from the registries the caller names and validated with a real JSON Schema
//! engine. Nothing here is a default: patterns, limits, the visibility order and the dialect
//! tables all come from the schema files.

use std::cell::RefCell;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::rc::Rc;

use jsonschema::error::ValidationErrorKind;
use jsonschema::{Draft, PatternOptions, Registry, Resource, ValidationError, Validator};
use regex::Regex;
use serde_json::Value;

use crate::Fault;
use crate::json::V;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Class {
    Card,
    Asset,
}

#[derive(Clone, Debug)]
pub struct Kind {
    pub class: Class,
    pub schema: String,
    pub allow_tokens: bool,
}

pub struct Engine {
    pub kinds: HashMap<(String, i128), Kind>,
    pub envelope_id: String,
    pub card_class_id: String,
    pub asset_class_id: String,
    schemas: HashMap<String, Value>,
    registry: Registry<'static>,
    validators: RefCell<HashMap<String, Rc<Validator>>>,
    /// Grammar of dotted keys and ids, read from `core.v1.json`.
    pub dotted: Regex,
    pub id_re: Regex,
    pub id_max: Option<usize>,
    /// Higher is more public. Derived from the order of the envelope's `visibility` enum.
    pub rank: HashMap<String, usize>,
}

type Res<T> = Result<T, String>;

fn read_json(path: &Path) -> Res<Value> {
    let text = fs::read_to_string(path).map_err(|e| format!("{}: {e}", path.display()))?;
    serde_json::from_str(&text).map_err(|e| format!("{}: {e}", path.display()))
}

fn collect_json(dir: &Path, out: &mut Vec<PathBuf>) -> Res<()> {
    let mut entries: Vec<PathBuf> = fs::read_dir(dir)
        .map_err(|e| format!("{}: {e}", dir.display()))?
        .filter_map(|e| e.ok().map(|e| e.path()))
        .collect();
    entries.sort();
    for path in entries {
        if path.is_dir() {
            collect_json(&path, out)?;
        } else if path.extension().is_some_and(|x| x == "json") {
            out.push(path);
        }
    }
    Ok(())
}

impl Engine {
    pub fn load(registry_paths: &[String]) -> Res<Engine> {
        let mut kinds: HashMap<(String, i128), Kind> = HashMap::new();
        let mut schemas: HashMap<String, Value> = HashMap::new();
        let mut envelope_id: Option<String> = None;
        let mut classes: HashMap<String, String> = HashMap::new();
        for idx_path in registry_paths.iter().map(PathBuf::from) {
            let idx = read_json(&idx_path)?;
            if let Some(Value::String(id)) = idx.get("envelope") {
                envelope_id = Some(id.clone());
            }
            if let Some(Value::Object(map)) = idx.get("classes") {
                for (name, id) in map {
                    if let Value::String(id) = id {
                        classes.insert(name.clone(), id.clone());
                    }
                }
            }
            let entries = idx.get("kinds").and_then(Value::as_array).ok_or("registry has no kinds list")?;
            for entry in entries {
                let kind = entry.get("kind").and_then(Value::as_str).ok_or("registry entry without kind")?;
                let version = entry
                    .get("schema_version")
                    .and_then(Value::as_i64)
                    .ok_or("registry entry without schema_version")?;
                let class = match entry.get("class").and_then(Value::as_str) {
                    Some("card") => Class::Card,
                    Some("asset") => Class::Asset,
                    _ => return Err(format!("registry entry {kind}: unknown class")),
                };
                let schema = entry.get("schema").and_then(Value::as_str).ok_or("registry entry without schema")?;
                let allow_tokens = entry.get("allow_tokens").and_then(Value::as_bool).unwrap_or(true);
                let key = (kind.to_string(), i128::from(version));
                let entry = Kind { class, schema: schema.to_string(), allow_tokens };
                if kinds.insert(key.clone(), entry).is_some() {
                    return Err(format!("kind registered twice: {key:?}"));
                }
            }
            let dir = idx_path.parent().ok_or("registry has no directory")?;
            let mut files = Vec::new();
            collect_json(dir, &mut files)?;
            for file in files {
                let name = file.file_name().and_then(|n| n.to_str()).unwrap_or("");
                if name == "index.json" || name == "limits.json" {
                    continue;
                }
                let schema = read_json(&file)?;
                let id = schema.get("$id").and_then(Value::as_str).ok_or(format!("{}: no $id", file.display()))?;
                schemas.insert(id.to_string(), schema);
            }
        }
        let envelope_id = envelope_id.ok_or("registry must define envelope")?;
        let card_class_id = classes.get("card").cloned().ok_or("registry must define the card class")?;
        let asset_class_id = classes.get("asset").cloned().ok_or("registry must define the asset class")?;

        let mut registry = Registry::new();
        for (id, schema) in &schemas {
            registry = registry
                .add(id.as_str(), Resource::from_contents(schema.clone()))
                .map_err(|e| format!("registry: {id}: {e}"))?;
        }
        let registry = registry.prepare().map_err(|e| format!("registry: {e}"))?;

        let core = schemas
            .iter()
            .find(|(id, _)| id.ends_with("/core.v1.json"))
            .map(|(_, s)| s)
            .ok_or("schema not loaded: core.v1.json")?;
        let defs = core.get("$defs").ok_or("core.v1.json has no $defs")?;
        let pattern = |name: &str| -> Res<Regex> {
            let p = defs
                .get(name)
                .and_then(|d| d.get("pattern"))
                .and_then(Value::as_str)
                .ok_or(format!("core.v1.json: {name} has no pattern"))?;
            Regex::new(p).map_err(|e| format!("core.v1.json: {name}: {e}"))
        };
        let dotted = pattern("dotted_key")?;
        let id_re = pattern("id")?;
        let id_max = defs.get("id").and_then(|d| d.get("maxLength")).and_then(Value::as_u64).map(|n| n as usize);

        let order = schemas
            .get(&envelope_id)
            .and_then(|s| s.pointer("/properties/visibility/enum"))
            .and_then(Value::as_array)
            .ok_or("envelope has no visibility enum")?;
        let rank = order
            .iter()
            .enumerate()
            .filter_map(|(i, v)| v.as_str().map(|s| (s.to_string(), order.len() - 1 - i)))
            .collect();

        Ok(Engine {
            kinds,
            envelope_id,
            card_class_id,
            asset_class_id,
            schemas,
            registry,
            validators: RefCell::new(HashMap::new()),
            dotted,
            id_re,
            id_max,
            rank,
        })
    }

    fn validator(&self, id: &str) -> Res<Rc<Validator>> {
        if let Some(v) = self.validators.borrow().get(id) {
            return Ok(v.clone());
        }
        if !self.schemas.contains_key(id) {
            return Err(format!("schema not loaded: {id}"));
        }
        let wrapper = serde_json::json!({ "$ref": id });
        let built = jsonschema::options()
            .with_draft(Draft::Draft202012)
            .with_registry(&self.registry)
            // The regex engine runs in linear time, which is what hostile input needs. The
            // schemas only use the ASCII subset SPEC 4.1 allows.
            .with_pattern_options(PatternOptions::regex())
            .should_validate_formats(false)
            .offline()
            .build(&wrapper)
            .map_err(|e| format!("schema {id}: {e}"))?;
        let rc = Rc::new(built);
        self.validators.borrow_mut().insert(id.to_string(), rc.clone());
        Ok(rc)
    }

    /// Every schema violation as `E_SCHEMA`, one per error location. Composite keywords are
    /// flattened so the nested causes are reported too.
    ///
    /// A schema the registry does not hold is a broken installation, not bad input, so it panics;
    /// the protocol layer reports a panic as `E_IMPL_CRASH`.
    pub fn schema_errors(&self, schema_id: &str, instance: &V) -> Vec<Fault> {
        let validator = self.validator(schema_id).unwrap_or_else(|e| panic!("{e}"));
        let value = instance.to_serde();
        let mut out = Vec::new();
        for err in validator.iter_errors(&value) {
            flatten(&err, &mut out);
        }
        out
    }

    pub fn kind(&self, kind: &str, version: i128) -> Option<&Kind> {
        self.kinds.get(&(kind.to_string(), version))
    }

    pub fn kind_name_known(&self, kind: &str) -> bool {
        self.kinds.keys().any(|(k, _)| k == kind)
    }
}

fn pointer_of(err: &ValidationError<'_>) -> String {
    err.instance_path().to_string()
}

fn flatten(err: &ValidationError<'_>, out: &mut Vec<Fault>) {
    out.push(Fault { code: "E_SCHEMA", pointer: pointer_of(err) });
    match err.kind() {
        ValidationErrorKind::AnyOf { context }
        | ValidationErrorKind::OneOfNotValid { context }
        | ValidationErrorKind::OneOfMultipleValid { context } => {
            for branch in context {
                for sub in branch {
                    flatten(sub, out);
                }
            }
        }
        _ => {}
    }
}
