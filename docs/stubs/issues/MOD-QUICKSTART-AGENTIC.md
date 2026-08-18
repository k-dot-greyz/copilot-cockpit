## [MOD-QUICKSTART-AGENTIC] Non-interactive agent bootstrap script

**Labels:** `stub-follow-up`, `dev-dx`, `tier-0`, `agent`  
**Dex card:** `dex/cards/MOD-QUICKSTART-AGENTIC.json`  
**Epic:** COCKPIT-DEVDX-001

### Summary

Implement `scripts/quickstart-agent.sh` for cloud agents and CI: no prompts, env vars only, exits 0/1.

### Acceptance

- [ ] `npm run quickstart:agent` passes in cloud agent VM
- [ ] `GITHUB_TOKEN` never echoed
- [ ] `--non-interactive` env-check path works

### Depends on

- MOD-ENV-SECURE
