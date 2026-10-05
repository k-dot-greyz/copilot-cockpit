# Card Core

Universal metadata for cards and assets, plus the conformance suite that proves two implementations behave identically.

- **[SPEC.md](SPEC.md)** is the specification. Start here.
- `schemas/` is the JSON Schema 2020-12 implementation of the spec.
- `conformance/` is the normative test: 348 rows, language-neutral JSON.
- `tools/` holds the reference implementation (Python), the harness, and helpers.

## What it gives you

| Piece | What it does |
| --- | --- |
| Envelope | Seven required fields on every card and asset: `schema_version`, `kind`, `id`, `rev`, `status`, `visibility`, `owner`. |
| Cards | `extends` one parent, `params` per kind. Parent and child merge; defaults come from a `core.defaults` card via `$defaults.<key>`. |
| Assets | Artifact digest, lineage, licence ledger, human contribution and AI disclosure. Three rules in the schema keep unlicensed or unevidenced assets in `draft`. |
| Packs | A manifest of cards with relative paths and file digests. Path traversal is rejected by the grammar itself. |
| Adapters | Wrap an existing artifact verbatim as `legacy.wrap` and get it back unchanged. |
| Conformance | Any implementation, in any language, proves itself by passing the suite. |

Nothing in the schemas or the engine is a product name, a model name or a default. A default is a value in a card.

## Run it

Needs Python 3.11 or newer and `jq` (for the digest parity check).

```bash
pip install -r card-core/requirements.txt
python card-core/tools/run_conformance.py              # the suite
python card-core/tools/run_conformance.py --selftest   # prove the suite goes red when it should
python -m pytest card-core/tests -q                    # every row as its own test
```

Useful flags: `--case TEXT` and `--op validate|lint|resolve|freshness|adapt` filter rows, `--list` prints row ids, `-v` shows every failure.

## How the suite is built

- **Negatives are minimal pairs.** A case file has one passing input and a list of mutations. Each mutation changes one thing and names the error it must produce. A rule that no mutation exercises is a rule nobody tests.
- **Goldens are authored, not generated.** Expected outputs and their digests are written independently of the implementation. `tools/digest.sh` computes a digest with `jq` and `sha256sum`; the suite checks it against Python's own. There is deliberately no flag that regenerates goldens from an implementation.
- **The suite tests itself.** `--selftest` flips every expectation, corrupts digests, weakens the schemas and mutates the reference implementation's source. All of them must turn rows red. This found two missing fixtures and one real bug while the suite was being written.

## Implement it in another language

Speak the protocol in SPEC.md section 11: one JSON request on stdin, one JSON response on stdout, then run

```bash
python card-core/tools/run_conformance.py --impl-cmd "your-command"
```

`tools/ref_cli.py` is a working example. The five operations are `lint`, `validate`, `resolve`, `freshness` and `adapt` (plus `unwrap` for the round-trip check).

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
    digest.sh                   independent digest (jq + sha256sum)
    setup-toolchain.sh          optional, pinned toolchain bootstrap for cloud sessions
  tests/test_conformance.py     pytest wrapper
```

## Where this lives

This directory is self-contained and imports nothing from the rest of the repository, so it can move to its own home with `git mv`. It sits here for now. See [LINEAGE.md](LINEAGE.md).
