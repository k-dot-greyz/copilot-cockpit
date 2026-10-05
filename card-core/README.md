# Card Core

Universal metadata for cards and assets, plus the conformance suite that proves two implementations behave identically.

- **[SPEC.md](SPEC.md)** is the specification. Start here.
- `schemas/` is the JSON Schema 2020-12 implementation of the spec.
- `conformance/` is the normative test: language-neutral JSON rows, plus the expected outputs.
- `tools/` holds the reference implementation (Python), the harness, and helpers.
- `rust/` is a second implementation (Rust). It passes the same suite through the stdin/stdout protocol.

## What it gives you

| Piece | What it does |
| --- | --- |
| Envelope | Seven required fields on every card and asset: `schema_version`, `kind`, `id`, `rev`, `status`, `visibility`, `owner`. |
| Cards | `extends` one parent, `params` per kind. Parent and child merge; defaults come from a `core.defaults` card via `$defaults.<key>`. |
| Assets | Artifact digest, lineage, licence ledger, human contribution and AI disclosure. Three rules in the schema keep unlicensed or unevidenced assets in `draft`. |
| Packs | A manifest of cards with relative paths and file digests. Path traversal is rejected by the grammar itself. |
| Adapters | Wrap an existing artifact verbatim as `legacy.wrap` and get it back unchanged. |
| Conformance | Any implementation, in any language, proves itself by passing the suite. Two do today. |

Nothing in the schemas or the engine is a product name, a model name or a default. A default is a value in a card.

## Run it

Needs Python 3.11 or newer and `jq` (for the digest parity check).

```bash
pip install -r card-core/requirements.txt
python card-core/tools/run_conformance.py              # the suite, against the Python reference
python card-core/tools/run_conformance.py --selftest   # prove the suite goes red when it should
python -m pytest card-core/tests -q                    # every row as its own test
cargo test --manifest-path card-core/rust/Cargo.toml   # the Rust implementation, same suite
```

Useful flags: `--case TEXT` and `--op validate|lint|resolve|freshness|adapt` filter rows, `--list` prints row ids, `-v` shows every failure.

## How the suite is built

- **Negatives are minimal pairs.** A case file has one passing input and a list of mutations. Each mutation changes one thing and names the error it must produce. A rule that no mutation exercises is a rule nobody tests.
- **Goldens are authored, not generated.** Expected outputs and their digests are written independently of the implementation. `tools/digest.sh` computes a digest with `jq` and `sha256sum`; the suite checks it against Python's own. There is deliberately no flag that regenerates goldens from an implementation.
- **The suite tests itself.** `--selftest` flips every expectation, corrupts digests, weakens the schemas and mutates the reference implementation's source. All of them must turn rows red. This found missing fixtures and real bugs while the suite was being written. `tools/rust_mutants.py` does the same to the Rust crate; it rebuilds once per mutant, so it is run by hand.

## Implementations

| Implementation | Where | JSON Schema engine | Run it |
| --- | --- | --- | --- |
| Reference (Python) | `tools/cardcore_ref.py` | `jsonschema` | `python card-core/tools/run_conformance.py` |
| Rust | `rust/` (crate `cardcore`) | `jsonschema` crate, linear-time regex engine | `cargo build --release --manifest-path card-core/rust/Cargo.toml` then `python card-core/tools/run_conformance.py --impl-cmd "card-core/rust/target/release/cardcore protocol"` |

Both are conformance targets, not sources of truth: the specification and the suite are. Neither implementation contains a default; limits, kinds and schemas are read from the registries named in each request. The Rust binary also has `cardcore digest FILE` (the canonical-JSON digest of SPEC section 9).

What the second implementation taught the first: it was built from the specification and then compared with the reference on tens of thousands of mutated inputs. Every disagreement was a rule the specification had left to Python's behaviour (`$` before a trailing newline, `True == 1`, `str.lower()` folding the Kelvin sign, a pointer holding a lone surrogate, integers over 4300 digits, duplicates inside a replaced value) or a plain inconsistency (a card whose `id` differs from its key in `resolve`). Each one became a spec sentence, a failing row and then a fix, in that order.

### Implement it in another language

Speak the protocol in SPEC.md section 11: one JSON request on stdin, one JSON response on stdout, then run

```bash
python card-core/tools/run_conformance.py --impl-cmd "your-command"
```

`tools/ref_cli.py` and `rust/src/protocol.rs` are working examples. The five operations are `lint`, `validate`, `resolve`, `freshness` and `adapt` (plus `unwrap` for the round-trip check).

## Add a kind

1. Add `schemas/kinds/<kind>.v1.json` that references `card.v1.json` and constrains `params`.
2. Register it in `schemas/index.json`.
3. Add a case file under `conformance/cases/` with one passing input and a mutation for every rule, then list it in `conformance/index.json`.

The core never changes for a new kind.

## Layout

```
card-core/
  SPEC.md                       the specification
  LINEAGE.md                    who owns what
  schemas/                      core, envelope, card, asset, kinds/, ext/, index.json, limits.json
  conformance/
    index.json                  every case file, listed
    cases/<op>/...              case files (mutations or rows), raw lint inputs, pack files
    golden/                     expected outputs
    schemas/                    conformance-only kinds
  tools/
    run_conformance.py          the harness
    cardcore_ref.py             reference implementation
    ref_mutants.py              source mutants used by --selftest
    ref_cli.py                  stdin/stdout protocol adapter
    rust_mutants.py             source mutants of the Rust crate (manual check)
    digest.sh                   independent digest (jq + sha256sum)
    setup-toolchain.sh          optional, pinned toolchain bootstrap for cloud sessions
  tests/test_conformance.py     pytest wrapper
  rust/                         second implementation: Cargo.toml, src/, tests/
```

## Where this lives

This directory is self-contained and imports nothing from the rest of the repository, so it can move to its own home with `git mv`. It sits here for now. See [LINEAGE.md](LINEAGE.md).
