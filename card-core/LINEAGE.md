# Lineage

This directory is the single source of truth for Card Core v1: the specification, the schemas and the conformance suite.

- **Consumers** copy `schemas/` pinned to a git commit or tag. They do not fork the core schemas. A consumer's own kinds live in the consumer's own tree and are registered in its own kind registry.
- **Changes** start in `SPEC.md`. Then a fixture that fails, then the schema or code that makes it pass. A schema change without a fixture change is a defect.
- **Hydrators and runners** in other languages are conformance targets. Passing `conformance/` is what makes one of them correct; there is no second source of truth.

## Home

Card Core is generic and has no dependency on the Copilot Cockpit application. It lives in this repository for now because this is where it was started. Cockpit's `CONTRIBUTING.md` scopes the repository to the Copilot Cockpit product, so this directory is an exception and is built to leave: no imports from `src/`, its own `.gitignore`, its own CI workflow (`.github/workflows/card-core.yml`), and no entry in the cockpit's `package.json`.

`tools/setup-toolchain.sh` is environment tooling for the cloud sessions this was built in. It is optional and independent of everything else here.

## Data policy

Fixtures contain synthetic data only: example owners, example URLs, invented clients. No real lane, rate, client or credential belongs in this directory, because the repository is public.
