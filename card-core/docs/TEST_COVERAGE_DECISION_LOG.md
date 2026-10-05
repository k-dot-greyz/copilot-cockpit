# Card Core test coverage decision log

## CC-PR31 — Rust conformance target (feat PR #31)

**Feat:** [copilot-cockpit#31](https://github.com/k-dot-greyz/copilot-cockpit/pull/31) (`claude/dazzling-faraday-fir1wp`)  
**Test PR:** (linked coverage PR targeting the feat branch)  
**Harness:** `card-core/tests/test_protocol_ux_security_pr31.py` + existing `test_conformance.py` (427 rows)

### Stories implemented (80/20)

| ID | Type | Impact | Scenario | Win condition |
| --- | --- | --- | --- | --- |
| CC31-CI-01 | DX | Medium | Contributor expects Rust CI to gate merge | `card-core.yml` contains release build + `run_conformance.py --impl-cmd … protocol` |
| CC31-H-01 | Happy | High | Python `ref_cli` is a supported integration surface | Per-op sample rows match in-process reference |
| CC31-H-02 | Happy | High | PR #31 spec pins ride the protocol boundary | Curated rows pass via `ref_cli` |
| CC31-H-03 | Happy | High | Rust release binary is a second conformance target | Per-op sample rows match in-process reference |
| CC31-H-04 | Happy | High | Same curated rows on Rust | Curated rows pass via Rust protocol |
| CC31-S-01 | Sad | High | Agentic op injection / shell metacharacters | `E_OP_UNKNOWN`, exit 0, no host command execution |
| CC31-S-02 | Sad | High | Malformed protocol on Rust | One JSON line, exit 0, `E_IMPL_PROTOCOL` or `E_IMPL_CRASH` |
| CC31-SEC-01 | Security | Critical | `lint` + attacker-controlled `raw_path` | Response never contains raw file bytes (Python) |
| CC31-SEC-02 | Security | High | Missing registry path | stdout is JSON `E_IMPL_CRASH`, no traceback |
| CC31-SEC-03 | Security | Critical | Same lint exfiltration vector on Rust | No secret payload in stdout/stderr |
| CC31-A-01 | Ablation | High | Dual implementation drift | Python vs Rust identical JSON on curated rows |

### Security attack surfaces considered

| Surface | Realistic vector | Coverage |
| --- | --- | --- |
| Protocol stdin | Oversized/malformed JSON, wrong types | CC31-S-02; full suite lint/validate rows |
| `op` field | Injection of shell syntax or unknown ops | CC31-S-01 |
| `lint.raw_path` | Read arbitrary readable files | CC31-SEC-01/03 (no content echo) |
| `registries` | Point at missing or hostile paths | CC31-SEC-02; conformance + `E_IMPL_CRASH` rows |
| Card JSON | `$unset`, tokens, open-card params | Curated rows + 427-row suite |

### Explicitly not duplicated (low leverage)

- Re-running all 427 rows in this file (already parametrized in `test_conformance.py` and CI `run_conformance.py`).
- `rust_mutants.py` in CI (manual tool per feat PR; follow-up issue).
- Cockpit Astro/Playwright tests (no UI changes in feat PR).

### Documentation / follow-up todos

- [ ] Issue: wire `rust_mutants.py` into optional CI workflow_dispatch job.
- [ ] Issue: align `ref_cli.py` malformed stdin with Rust (`E_IMPL_PROTOCOL` + exit 0) if product wants symmetric hosts.
- [ ] Add `CARD_CORE_RUST_BIN` / `CARD_CORE_BUILD_RUST=1` to contributor docs for local Rust parity (Python CI skips Rust tests without a release binary).
