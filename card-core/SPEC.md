# Card Core v1: universal card and asset metadata

Status: draft 1.0.0-draft. Normative words (MUST, MUST NOT, SHOULD) are used as in RFC 2119.

This document is the specification. The JSON Schemas under `schemas/` and the fixtures under `conformance/` implement it. Where a schema and this document disagree, this document wins and the schema is the bug.

## 1. Purpose and non-goals

Card Core defines the small set of metadata every card and every asset carries, how cards inherit from each other, how defaults are resolved, and how an implementation proves it behaves identically to every other implementation.

It is a data contract, not a runtime. Any language can implement it. The only normative test of an implementation is the conformance suite in `conformance/`.

Non-goals for v1: a policy engine, a scheduler, a UI, domain kinds beyond the exemplars in section 6, and any product-specific vocabulary.

## 2. Principles

1. **Implementation-agnostic.** JSON Schema 2020-12 plus JSON fixtures. No code is normative except the behaviour the fixtures pin.
2. **Fail closed.** Unknown keys, unknown kinds, unknown enum values and unknown references are typed failures. There is no silent default, anywhere.
3. **No hardcoded defaults.** A default is a value in a `core.defaults` card, referenced by `$defaults.<key>`. Limits that are not schema constraints live in `schemas/limits.json`. An implementation contains no literal default.
4. **Schema is authoritative.** Implementations validate with a real JSON Schema validator. Hand-written rules duplicating a schema are a defect.
5. **Unknown stays unknown.** A missing fact is an explicit `unknown` state with a `null` value. It is never guessed and never zero.
6. **Deterministic.** The same input yields the same output and digest in every implementation. No operation reads a clock, a random source or the network. Dates are injected.
7. **Hostile input.** Every byte of input is untrusted. Strings, arrays and nesting are bounded. Free text is data and is never an instruction.
8. **Everything is a card.** Definitions, defaults, policies and pack manifests are all cards with the same envelope.

## 3. Vocabulary

| Term | Meaning |
| --- | --- |
| card | A design-time definition. Has an envelope and `params`. May extend one other card. |
| asset | A produced or imported item. Has an envelope plus artifact, lineage, licence and contribution metadata. Cannot extend. |
| envelope | The universal top-level fields (section 4). |
| params | The kind-specific payload of a card. Only `params` is inherited and merged. |
| kind | A namespaced name such as `core.policy`. Each `(kind, schema_version)` maps to one schema through the kind registry. |
| pack | A card of kind `core.pack` that lists cards with paths and digests. |
| extension | A namespaced optional block under `ext`, validated by its own schema. |
| op | One of the operations in section 8. |

## 4. The envelope

Every card and asset MUST have these top-level fields.

| Field | Type | Rule |
| --- | --- | --- |
| `schema_version` | integer | at least 1. Version of the kind schema. |
| `kind` | string | grammar below |
| `id` | string | grammar below. Unique within a pack. |
| `rev` | integer | at least 1. Increases whenever content changes. |
| `status` | string | `draft`, `active`, `deprecated` or `retired` |
| `visibility` | string | `public`, `internal` or `private` |
| `owner` | string | actor grammar below |

Optional envelope fields:

| Field | Type | Rule |
| --- | --- | --- |
| `title` | string | 1 to 200 characters |
| `as_of` | string | date. When the facts in the card were true. |
| `review_by` | string | date. After this date the card is stale (section 8.4). |
| `aliases` | array of string | up to 16 unique legacy identifiers, visible ASCII |
| `tags` | array of string | up to 32 unique tags |
| `provenance` | object | `authored_by` (1 to 8 actors), `method` (`authored`, `imported`, `derived`, `generated`), `sources` (up to 32 of `ref`, optional `rev`, `sha256`, `license`) |
| `ext` | object | keys are registered extension namespaces (section 7) |

Cards add `extends` (an id), `refs` (up to 64 of `rel`, `id`, optional `rev`) and `params` (an object, required). Assets add the fields in section 4.2.

### 4.1 Grammars

All patterns are ASCII and anchored.

| Name | Pattern | Limit |
| --- | --- | --- |
| id | `^[a-z0-9][a-z0-9_-]*(\.[a-z0-9][a-z0-9_-]*)*$` | 128 characters |
| kind | `^[a-z][a-z0-9]*(\.[a-z][a-z0-9_-]*)+$` | 64 characters |
| actor | `^(human\|ai\|system):[a-z0-9][a-z0-9_.-]*$` | 64 characters |
| date | `^[0-9]{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12][0-9]\|3[01])$` | 10 characters |
| sha256 | `^sha256:[0-9a-f]{64}$` | 71 characters |
| tag | `^[a-z0-9][a-z0-9_-]{0,31}$` | 32 characters |
| dotted key | `^[a-z0-9_]+(\.[a-z0-9_]+)*$` | 128 characters |
| path | `^[A-Za-z0-9_@+-][A-Za-z0-9_.@+-]*(/[A-Za-z0-9_@+-][A-Za-z0-9_.@+-]*)*$` | 256 characters |

The path grammar is a relative POSIX path. Every segment starts with a non-dot character, so `.` and `..` segments cannot occur. It has no `%`, `\`, `:` or NUL, so percent-encoded dots, backslashes, drive letters and NUL bytes are rejected by the pattern itself. A path is never normalised; it is accepted or rejected as written.

### 4.2 Asset fields

An asset has `kind` `core.asset` and these required fields besides the envelope: `provenance`, `artifact`, `lineage`, `license_ledger`, `human_contribution`, `disclosure`.

- `artifact`: `media_type`, `size_bytes`, `sha256`, `locator` (a path or null), `placeholder` (boolean). A placeholder has `locator` null, `sha256` null and `size_bytes` 0. A non-placeholder has a path and a digest.
- `lineage`: `parents` (up to 64 of `id`, `rev`, optional `sha256`), `produced_by` (null or `card`, `rev`, `run`), `seed` (null or integer).
- `license_ledger`: up to 64 entries of `input`, `license`, `grant` (`owned`, `licensed`, `open`, `unknown`), `evidence` (null or text).
- `human_contribution`: up to 64 entries of `actor`, `role` (`authored`, `edited`, `selected`, `arranged`, `approved`), `rev` (null or integer), `evidence` (null or text).
- `disclosure`: `ai_used` (`none`, `assisted`, `generated`, `unknown`) and `tags` (up to 16).

Schema-level rules for assets. These express what no jurisdiction can change, so they are in the schema and not in a policy:

1. If any `license_ledger` entry has `grant` `unknown`, then `status` MUST be `draft`.
2. If `disclosure.ai_used` is `unknown`, then `status` MUST be `draft`.
3. If `disclosure.ai_used` is `assisted` or `generated` and `human_contribution` is empty, then `status` MUST be `draft`.

Whether an asset may be sold, listed or called exclusive is a policy decision made later from these facts. It is not decided here.

## 5. Numbers, strings and size

- Numbers are integers. A JSON number with a fraction or exponent is rejected, including `2.0` and `1e3` (`E_FLOAT`). Fractions are basis points (`_bps`), money is cents (`_cents`). This keeps canonical JSON identical across languages.
- Integers MUST be within plus or minus 9007199254740991 (`E_INT_RANGE`).
- Object keys MUST be ASCII (`E_KEY_NONASCII`).
- Strings MUST be valid Unicode and MUST NOT contain U+007F or lone surrogates (`E_ENCODING`).
- Any string shaped like a date (`NNNN-NN-NN`) anywhere in a card MUST be a real calendar date (`E_DATE_INVALID`).
- Duplicate object keys are rejected (`E_DUP_KEY`). JSON allows them; parsers silently keep the last, which hides merge damage.
- Documents are UTF-8 without a byte-order mark (`E_BOM`), at most `max_json_bytes` (`E_TOO_LARGE`) and nested at most `max_nesting_depth` (`E_TOO_DEEP`). `NaN` and `Infinity` are rejected (`E_NONFINITE`).

All free-text fields have a maximum length and every array has a maximum size in its schema.

## 6. Kinds shipped with v1

| Kind | Role |
| --- | --- |
| `core.defaults` | The `$defaults` namespace. `params.values` maps dotted keys to string, integer or boolean. A string value MUST NOT start with `$`. |
| `core.policy` | A perishable set of rules about a subject. MUST have `as_of` and `review_by`. |
| `core.pack` | A manifest of cards: `params.defaults_ref` (id or null), `params.requires` (other packs), `params.cards` (id, kind, schema_version, rev, path, sha256). |
| `core.asset` | The asset base in section 4.2. |
| `demand.opportunity` | Exemplar domain kind: a sourced opportunity with extraction, scoring and safety state. Shows unknown-stays-unknown, uncalibrated ranking and quarantine rules in schema form. |
| `legacy.wrap` | Carries an existing artifact verbatim (section 9). |

Conformance-only kinds `test.thing` and `test.typed` live under `conformance/schemas/` and are not part of the normative set.

A new kind adds a schema file and an entry in a kind registry. It never changes the core. A kind schema constrains `params` and MAY require optional envelope fields. It MUST NOT add top-level properties.

Kind registry: `schemas/index.json` maps each `(kind, schema_version)` to a schema `$id`. A consumer may supply more registries.

## 7. Extensions

`ext` holds optional blocks keyed by namespace. An unknown namespace is rejected. v1 registers one namespace.

`ext.dex`: `dex_id` (two or three colon-separated parts `0xNN:0xNN` with an optional slug, for example `0x7D:0x10` or `0x7D:0x11:MOD-NAME`), `dex_type` (string), optional `midi_2_0_context` (`resource_type`, `property_exchange_id`) and optional `legacy_map` (`midi_1_0_bank`, `midi_1_0_prog`, each 0 to 127).

## 8. Operations

An implementation provides these operations. Inputs and outputs are JSON. Every failure is a list of `{code, pointer}` where `pointer` is an RFC 6901 pointer into the input. Codes are stable; messages are advisory.

```
raw bytes --lint--> value --validate--> ok
                       |
            cards + target (+ defaults)
                       v
              resolve: extends merge -> defaults substitution -> kind schema
                       v
              resolved card + lineage + digest
```

### 8.1 lint

Parses bytes into a value and applies every rule in section 5 that can be checked on text or value. Returns the value or the lint errors. Lint errors are returned alone: if lint fails, no later check runs.

### 8.2 validate

1. Run value-level lint.
2. Validate against the envelope schema. Any envelope violation is `E_SCHEMA`, and no later step runs.
3. Look up `(kind, schema_version)` in the registry. A well-formed kind that is not registered is `E_KIND_UNKNOWN` at `/kind`. A registered kind with another version is `E_KIND_UNKNOWN` at `/schema_version`.
4. Validate against the class schema (card or asset) and then the kind schema.
   - A card is **open** if it has `extends` or any `$defaults` / `$unset` token in `params`. An open card is validated by the envelope and card schemas only, because its `params` is partial until resolved. Kind validation happens in `resolve`.
   - A **closed** card is fully validated here.
5. Semantic checks: calendar-valid dates (`E_DATE_INVALID`) and `as_of` not after `review_by` (`E_DATE_ORDER`).
6. If the card is a pack and a base directory is given, check the pack against the files: unique ids (`E_ID_DUP`), each file exists (`E_PACK_MISSING`), the SHA-256 of the file bytes equals the entry (`E_HASH_MISMATCH`), the file's `id`, `kind`, `schema_version` and `rev` equal the entry (`E_PACK_MISMATCH`), and every `extends`, `refs[].id` and `defaults_ref` names a pack id (`E_REF_MISSING`). Each file card is itself validated with this operation.

### 8.3 resolve

Input: a map of cards, a target id, and optionally a defaults card id.

1. Build the chain from the target through `extends` to the root. A missing target is `E_REF_MISSING`. A repeated id is `E_EXTENDS_CYCLE`. More cards than `extends_max_depth` is `E_EXTENDS_DEPTH`. A parent with another `kind` or `schema_version` is `E_EXTENDS_KIND`.
2. Visibility ratchet: a card MUST NOT be more public than any ancestor. The order is `private` < `internal` < `public`. Violation is `E_VISIBILITY_WIDEN`.
3. Merge `params` from the root to the target. Objects merge recursively. Any other value, including an array, is replaced by the child value. The marker `{"$unset": true}` removes an inherited key: in a root card it is `E_UNSET_ORPHAN`, and for a key the merged parent does not have it is `E_UNSET_MISSING`. Any other object key starting with `$` is `E_DOLLAR_KEY`.
4. Defaults. If the merged `params` contains tokens, a defaults card is required. The defaults card is itself resolved (it may extend another defaults card; its values MUST NOT contain tokens). A string that is exactly `$defaults.<dotted key>` is replaced by the value, keeping its type. A missing key or missing defaults card is `E_DEFAULT_MISSING`. A string that contains `$defaults.` without being exactly a token is `E_DEFAULT_PARTIAL`. If any value is used, the target MUST NOT be more public than any card in the defaults chain (`E_VISIBILITY_WIDEN`).
5. Build the resolved card: the target envelope without `extends`, with the merged and substituted `params`. Validate it with `validate` (including the kind schema). Failures are reported with pointers into the resolved card.
6. Output:

```
{ "id", "kind", "schema_version", "params",
  "lineage": [ {"id","rev"}, ... root first, target last ],
  "defaults": null | { "id", "rev", "lineage": [...], "used": { key: value } } }
```

### 8.4 freshness

Input: a card and an `as_of` date supplied by the caller. A card with `review_by` is stale when `as_of` is after `review_by` (`E_STALE`, pointer `/review_by`). `review_by` is inclusive: on that date the card is fresh. A card with no `review_by` is fresh. A malformed or impossible `as_of` is `E_DATE_INVALID` at `/as_of`.

### 8.5 limits

`schemas/limits.json` holds `max_json_bytes`, `max_nesting_depth`, `extends_max_depth` and `int_max`. A caller may override them per request. They are data, not code.

## 9. Canonical JSON and digests

Canonical form: UTF-8, object keys sorted by code point, no insignificant whitespace, integers only. Because keys are ASCII and numbers are integers, this is identical to RFC 8785 for every legal document.

A digest is `sha256:` followed by the lowercase hex SHA-256 of the canonical bytes. `tools/digest.sh` computes it with `jq` and `sha256sum`, independent of the reference implementation. A pack entry digest is over the file bytes, not the canonical form.

## 10. Adapters

An adapter wraps an existing artifact as a `legacy.wrap` card without losing information. It never invents envelope values: `owner`, `visibility`, `rev` and, when the legacy artifact has no status, `status` come from an explicit `context` (`E_ADAPT_CONTEXT` if missing).

Output envelope: `kind` `legacy.wrap`, `schema_version` 1, `id` normalised from the legacy id, and `params` = `{dialect, original_kind, original}` where `original` is the legacy JSON verbatim. `aliases` holds the original id string when it differs from `id`; the dex dialects also add their `dex_id`. The output is validated like any card.

Id normalisation: lowercase, then each `:` becomes `.`. If the result does not match the id grammar, `E_ADAPT_ID`.

Status mapping for dex-style statuses: `active` to `active`, `deprecated` to `deprecated`, `experimental` to `draft`, `archived` to `retired`. Anything else is `E_ADAPT_STATUS`. A legacy status wins over `context.status`.

Round trip: `unwrap` returns `params.original`. For every adapter fixture, `unwrap(adapt(x))` MUST equal `x` in canonical form.

Dialects in v1:

| Dialect | Shape | id source | Extras |
| --- | --- | --- | --- |
| `kind-id` | `schema_version`, `kind`, `id` at top level | `id` | `original_kind` = `kind` |
| `schema-string` | fused `schema: "<ns>.<name>.v<N>"` and a colon-prefixed `id` | `id` | `original_kind` = `schema` |
| `dex-card` | `dex_id`, `dex_type`, `module_id`, `status`, `tags` | `module_id` | `ext.dex`, `tags`, mapped status |
| `dex-frontmatter` | `dex_id`, `dex_type`, `midi_2_0_context`, `legacy_map`, `status`, `tags` | `midi_2_0_context.property_exchange_id` without a leading `urn:` | `ext.dex`, `tags`, mapped status |

Legacy payloads containing a non-integer number cannot be wrapped (`E_FLOAT`).

## 11. Conformance contract

An implementation is conformant when every row of the suite passes. The suite is the normative test.

Layout under `conformance/`:

- `index.json` lists every case file. A file on disk that is not listed, or a listed file that is missing, fails the suite.
- `cases/` holds case files. `golden/` holds expected outputs. `schemas/` holds conformance-only kinds.

A case file has `op`, `title`, `input`, `expect`, optional `base_dir` (a directory next to the case file, for packs), optional `limits` (overrides) and either `mutations` or `rows`.

- `mutations`: each has a `name`, optional `set` (a map of JSON pointer to new value), optional `remove` (a list of pointers) and its own `expect`. A mutation is applied to a copy of `input`. A case with mutations MUST have a base `expect`, so every negative is a minimal pair of a passing input.
- `rows`: independent rows, used for raw-byte lint cases.

`expect` is one of:

- `{"ok": true}`
- `{"ok": true, "golden": "<path>", "digest": "sha256:..."}`: the output equals the golden in canonical form and both digest to the stated value.
- `{"ok": false, "errors": [{"code", "pointer"?}]}`: the set of returned codes equals the set of expected codes, and every expected pointer is present. Keyword and message are not compared.

Goldens and digests are authored independently of any implementation. There is deliberately no mode that regenerates them from an implementation's output.

Protocol for external implementations: one JSON request on stdin, one JSON response on stdout.

```
request:  {"op", "input", "base_dir", "registries": [paths], "limits": {...}}
response: {"ok": true, "output": ...}  or  {"ok": false, "errors": [{"code","pointer"}]}
```

Operations: `lint`, `validate`, `resolve`, `freshness`, `adapt`, `unwrap`.

### 11.1 The suite must have teeth

`--selftest` proves the suite is not a rubber stamp. It must go red when the expectations are flipped, when a digest is corrupted, and when each of these schema weakenings is applied in memory: remove the card closure, remove the envelope `required` list, remove the asset conditionals, widen the id pattern, and remove length limits. If any canary stays green, the suite itself is broken.

## 12. Error codes

| Code | Raised by | Meaning |
| --- | --- | --- |
| `E_PARSE` | lint | not valid JSON |
| `E_BOM` | lint | byte-order mark |
| `E_ENCODING` | lint | invalid UTF-8, lone surrogate or U+007F |
| `E_TOO_LARGE` | lint | over `max_json_bytes` |
| `E_TOO_DEEP` | lint | over `max_nesting_depth` |
| `E_DUP_KEY` | lint | duplicate object key |
| `E_NONFINITE` | lint | `NaN` or `Infinity` |
| `E_FLOAT` | lint, adapt | number with fraction or exponent |
| `E_INT_RANGE` | lint | integer outside the safe range |
| `E_KEY_NONASCII` | lint | non-ASCII object key |
| `E_SCHEMA` | validate, resolve, adapt | schema violation at `pointer` |
| `E_KIND_UNKNOWN` | validate | kind or version not registered |
| `E_DATE_INVALID` | validate, freshness | not a real calendar date |
| `E_DATE_ORDER` | validate | `as_of` after `review_by` |
| `E_ID_DUP` | validate (pack) | duplicate id in a pack |
| `E_PACK_MISSING` | validate (pack) | listed file not found |
| `E_HASH_MISMATCH` | validate (pack) | file digest differs from entry |
| `E_PACK_MISMATCH` | validate (pack) | file envelope differs from entry |
| `E_REF_MISSING` | validate (pack), resolve | referenced id not found |
| `E_EXTENDS_CYCLE` | resolve | `extends` loop |
| `E_EXTENDS_DEPTH` | resolve | chain longer than the limit |
| `E_EXTENDS_KIND` | resolve | parent has another kind or version |
| `E_VISIBILITY_WIDEN` | resolve | child more public than an ancestor or defaults card |
| `E_UNSET_ORPHAN` | resolve | `$unset` in a root card |
| `E_UNSET_MISSING` | resolve | `$unset` of a key that is not inherited |
| `E_DOLLAR_KEY` | resolve | unknown `$` key |
| `E_DEFAULT_MISSING` | resolve | token with no value or no defaults card |
| `E_DEFAULT_PARTIAL` | resolve | `$defaults.` inside a longer string |
| `E_STALE` | freshness | `as_of` after `review_by` |
| `E_ADAPT_DIALECT` | adapt | unknown dialect |
| `E_ADAPT_CONTEXT` | adapt | missing context |
| `E_ADAPT_ID` | adapt | id cannot be normalised |
| `E_ADAPT_STATUS` | adapt | status cannot be mapped |

## 13. Versioning

- `schema_version` is per kind. Adding an optional property is compatible. Anything that rejects a previously valid card, or accepts a previously invalid one, is breaking and bumps the version. Both versions stay in the registry.
- A new error code or a new fixture is additive. Changing the meaning of an existing code is breaking.
- The conformance suite is versioned with the spec. An implementation states the suite version it passes.
