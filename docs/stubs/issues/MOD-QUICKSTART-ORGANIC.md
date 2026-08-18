## [MOD-QUICKSTART-ORGANIC] Interactive dev bootstrap script

**Labels:** `stub-follow-up`, `dev-dx`, `tier-0`  
**Dex card:** `dex/cards/MOD-QUICKSTART-ORGANIC.json`  
**Epic:** COCKPIT-DEVDX-001

### Summary

Implement interactive `scripts/quickstart.sh` for human developers: env check, `.env` bootstrap, install, test smoke.

### Acceptance

- [ ] `npm run quickstart` works from clean clone
- [ ] Never commits or logs secrets
- [ ] Documented in `docs/stubs/dev-dx/QUICKSTART.md`

### Depends on

- MOD-ENV-SECURE (`.env.example`, `env-check.sh`)

### Out of scope

- Cloud agent path (see MOD-QUICKSTART-AGENTIC)
