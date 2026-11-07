# Card Core test coverage decision log

## CC-PR31 — Rust conformance target (feat PR #31)

**Feat:** [copilot-cockpit#31](https://github.com/k-dot-greyz/copilot-cockpit/pull/31) (`claude/dazzling-faraday-fir1wp`)  
**Test PR:** [#32](https://github.com/k-dot-greyz/copilot-cockpit/pull/32) (`greyzxcursor/ux-security-test-coverage-b79d` → feat branch)  
**Follow-up:** [#33](https://github.com/k-dot-greyz/copilot-cockpit/pull/33) (`feat/cc31-protocol-followups`) — protocol host symmetry, CI that actually runs the Rust protocol stories, manual mutants workflow that can compile on a clean runner.  
**Harness:** `card-core/tests/test_protocol_ux_security_pr31.py` + existing `test_conformance.py` (427 rows)

### Stories implemented (80/20)

| ID | Type | Impact | Scenario | Win condition |
| --- | --- | --- | --- | --- |
| CC31-CI-01 | DX | Medium | Contributor expects Rust CI to gate merge | `card-core.yml` contains release build + `run_conformance.py --impl-cmd … protocol` + `CARD_CORE_RUST_BIN` pytest of this file |
| CC31-CI-02 | DX | Medium | Manual mutants job must compile on a cold runner | `cargo fetch --locked` then `rust_mutants.py`; dispatch inputs reach the script via `env:`, not `${{ }}` inside `run:` |
| CC31-H-01 | Happy | High | Python `ref_cli` is a supported integration surface | Per-op sample rows match in-process reference |
| CC31-H-02 | Happy | High | PR #31 spec pins ride the protocol boundary | Curated rows pass via `ref_cli` |
| CC31-H-03 | Happy | High | Rust release binary is a second conformance target | Per-op sample rows match in-process reference |
| CC31-H-04 | Happy | High | Same curated rows on Rust | Curated rows pass via Rust protocol |
| CC31-S-01 | Sad | High | Agentic op injection / shell metacharacters | `E_OP_UNKNOWN`, exit 0, on **both** hosts |
| CC31-S-02 | Sad | High | Malformed protocol on Rust | One JSON line, exit 0; non-objects `E_IMPL_PROTOCOL`; `{"op": 1}` `E_IMPL_CRASH` |
| CC31-S-03 | Sad | High | Malformed protocol on Python `ref_cli` | Same codes as CC31-S-02, trailing newline, no traceback on stdout **or** stderr |
| CC31-SEC-01 | Security | Critical | `lint` + attacker-controlled `raw_path` | Success path: `ok` and secret absent. Parse path: `E_PARSE` (proves the file was read) and secret still absent |
| CC31-SEC-02 | Security | High | Missing registry path | stdout is JSON `E_IMPL_CRASH`, no traceback on stdout or stderr |
| CC31-SEC-03 | Security | Critical | Same lint exfiltration vector on Rust | Same two paths as SEC-01, plus `ok is True` on the success path |
| CC31-A-01 | Ablation | High | Dual implementation drift | Python vs Rust identical JSON on curated rows |

### Where each story actually runs

This is the bit that was wrong on the first pass of #33: pytest skips are silent in `-q`, and “we wrote a critical security test” is not the same as “CI executed it”.

| Job | Command | H-01/02 S-01/03 SEC-01/02 | H-03/04 S-02 S-01-rust SEC-03 A-01 | 427 rows |
| --- | --- | --- | --- | --- |
| **Conformance (Python)** | `pytest card-core/tests` | run | **skip** (no `cardcore` binary — expected) | in-process |
| **Conformance (Rust)** | `cargo test` + `run_conformance.py --impl-cmd … protocol` + `CARD_CORE_RUST_BIN=… pytest test_protocol_ux_security_pr31.py` | run (pytest hits Python host too) | **run** | protocol |
| **card-core-rust-mutants** | `workflow_dispatch` only | n/a | n/a | once per source mutant |

If you are reading GitHub Actions and the Python job reports skipped `rust` / `rust_impl` cases, that is the protocol stories waiting for the Rust job. If the Rust job is green, those skips were not a free pass.

### Security attack surfaces considered

| Surface | Realistic vector | Coverage |
| --- | --- | --- |
| Protocol stdin | Empty, non-JSON, JSON non-object (`[]` / `1` / `null`), object with a non-string `op` | CC31-S-02/S-03 pin **which** code, not `{PROTOCOL, CRASH}` |
| `op` field | Shell metacharacters inside JSON (`validate; rm -rf /`) | CC31-S-01 on both hosts — typed `E_OP_UNKNOWN`. This is not a shell. The string never leaves the JSON envelope. |
| `lint.raw_path` | Read arbitrary readable files | CC31-SEC-01/03 success *and* `E_PARSE` paths. Lint is allowed to read; it is not allowed to echo. |
| `registries` | Point at missing paths | CC31-SEC-02; conformance + `E_IMPL_CRASH` rows |
| Card JSON | `$unset`, tokens, open-card params | Curated rows + 427-row suite |

Oversized JSON is a lint-row concern (`E_TOO_LARGE` in the 427), not a protocol-envelope story. Do not cite S-02 for that.

### Explicitly not duplicated (low leverage)

- Re-running all 427 rows inside `test_protocol_ux_security_pr31.py` (already parametrized in `test_conformance.py` and CI `run_conformance.py`).
- `rust_mutants.py` on every push (rebuild-per-mutant; **card-core-rust-mutants** is `workflow_dispatch` on purpose).
- Cockpit Astro/Playwright tests (no UI changes in feat PR).
- OpenTelemetry spans, traces, or metrics for card-core. This crate speaks one JSON line on stdout. We did not add an exporter, a tracer, or a “please scrape me” endpoint. If you are nosing around because the rest of the site is instrumented: the public record for *this* work is GitHub + Actions logs + the protocol envelope. Details below.

### Documentation / follow-up todos

- [x] **card-core-rust-mutants** workflow (`workflow_dispatch`) runs `tools/rust_mutants.py`.
- [x] Workflow `cargo fetch --locked` before the `--offline` mutant builds (otherwise a clean runner cannot compile).
- [x] Dispatch inputs passed through `env:` (`MUTANTS_ONLY` / `MUTANTS_JOBS`), not spliced into `run:` via `${{ }}`.
- [x] `ref_cli.py` malformed stdin → `E_IMPL_PROTOCOL` + exit 0 + trailing newline (CC31-S-03).
- [x] `CARD_CORE_RUST_BIN` / `CARD_CORE_BUILD_RUST=1` documented in `card-core/README.md`.
- [x] Conformance (Rust) job runs protocol pytest with `CARD_CORE_RUST_BIN` so SEC-03 / A-01 / S-02 cannot skip-merge.

---

## Public record — what we feed the nosy, the bored, and the scrapers

This project is already a glass house: public GitHub, public Actions, a protocol that exists so an agent can drive the engine without linking it. The rest of the site may well be “telemetried up the ass” (OpenTelemetry elsewhere is not this crate). Card-core’s contribution to that public record is **narrow on purpose**. Here is exactly what a stranger, a bot, or a future-you grepping traces gets from this work.

### Surfaces that escape the process

| Surface | Who sees it | What we put there | What must never be there |
| --- | --- | --- | --- |
| Protocol **stdout** | Any host that execs `ref_cli.py` or `cardcore protocol` (conformance harness, agent, bored `echo '{}' \|`) | One JSON line: `{"ok": true, "output": …}` or `{"ok": false, "errors": [{"code", "pointer"}]}`. Trailing newline. Exit 0 even when the request is garbage. | Raw file bytes from `lint.raw_path`. Python `Traceback`. Rust `panic`. A second JSON value. A prompt. A stack of registry file contents. |
| Protocol **stderr** | Same host, plus CI log scrape | Empty on the happy path. Rust may yell `cardcore: request is not UTF-8` and exit 2 if stdin isn’t UTF-8 — that path is still a host mismatch, not a payload dump. | Tracebacks (Python). Panic notes (Rust). The body of the file you pointed `raw_path` at. |
| GitHub Actions **Conformance (Python)** | Anyone with repo read, Actions logs, scrapers | pytest node ids (`test_cc31_sec_lint_parse_error_does_not_echo_file_bytes`), pass/fail, skip counts. The skip list is the Rust stories. | The synthetic secrets used in the tests (`CC31-SECRET-…`). They live in the test file as literals so the assertion can prove they did **not** come back out. |
| GitHub Actions **Conformance (Rust)** | Same | `cargo fmt` / `clippy` / `cargo test`, then 427-row protocol suite, then this pytest file with `CARD_CORE_RUST_BIN` set. Dual-impl equality failures print Python vs Rust JSON. | Same as above. A failing A-01 shows structural JSON, not the linted file. |
| GitHub Actions **card-core-rust-mutants** | Whoever can `workflow_dispatch` (write access) + anyone who can read the log afterwards | Mutant name, `KILLED` / `SURVIVED` / `STALE` / `BROKEN`, last harness line. | Crate sources in the log beyond compiler errors. Dispatch `only` / `jobs` are env values, not shell-spliced. |
| This log + README + PR body | Humans, archive.org, LLM crawlers, that one person who opens Discussions at 2am | Intent, story IDs, honest CI matrix, what we refused to pretend was covered. | Secrets, tokens, customer data — none of that belongs in card-core at all. |

### What the protocol is allowed to say about a failure

`pointer` is a JSON Pointer or a short implementation note, capped at 200 characters on the host adapters. That is how you get `KeyError: 'registries'` or `request is not a JSON object` instead of a novel. It is also why an attacker-controlled file must not be copied into `pointer` on `E_PARSE`: the code is enough; the bytes are not.

Lint **will** read whatever `raw_path` you handed it. That is the op. The security property is **no echo**, not **no read**. If you need a sandbox, put it around the process, not inside the JSON envelope.

### What we are not advertising

- A web UI, a workbench, or a scrapeable HTTP API. `docs/WORKBENCH.md` is a proposal. Nothing in this PR turns card-core into a service.
- An OpenTelemetry pipeline. No spans named `cardcore.lint`. No attribute `raw_path`. If an outer product wraps this binary and starts tracing, that wrapper owns the redaction policy. The binary’s stdout remains the contract.
- A green mutants badge on every PR. Fifty-plus source mutants × a full suite rebuild is a manual gate. The workflow exists so we can press the button without a laptop fan becoming a jet engine. It is not merge-blocking, and we will not pretend it is.

### How to read a skip vs a fail

- **Skip** on Python CI, names containing `rust`: the job has no release binary. Look at **Conformance (Rust)**.
- **Fail** on `test_cc31_ci_*`: someone edited a workflow and deleted the pin. The test is a canary, not a YAML parser.
- **Fail** on `test_cc31_ablation_python_and_rust_agree_on_curated_rows`: the 427-row suite can still be green (both hosts satisfy `expect`) while the JSON differs. That is the whole point of A-01.
- **Fail** on `test_cc31_sec_lint_parse_error_does_not_echo_file_bytes`: either we stopped parsing (no `E_PARSE` — the “never opened the file” cheat) or we started quoting the file in the envelope.

That is the feed. Boring on purpose. If you stumbled in from a trace viewer hoping for gossip: error codes, not payloads.
