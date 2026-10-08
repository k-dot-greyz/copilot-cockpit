# Deploying `glitch.cards` routing

**Current DNS (2026-10):** Hostinger parking (`atlas.dns-parking.com` / `hyperion.dns-parking.com`) — no app attached yet.

## Option A — Vercel (matches this repo)

1. Merge slug routing PR and deploy **copilot-cockpit** on Vercel.
2. In Vercel → Project → **Domains** → add `glitch.cards` and `www.glitch.cards`.
3. In Hostinger hPanel → **DNS**, point apex/`www` to Vercel (A/CNAME per Vercel’s wizard).
4. Regenerate edge rules after editing slugs:
   ```bash
   node scripts/sync-glitch-cards-vercel.mjs
   ```

**Smoke tests**

```bash
curl -sSI https://glitch.cards/env-doctor | grep -i location
curl -sS https://glitch.cards/cards/dex/MOD-PIPE-HYDRATE | head
curl -sS https://glitch.cards/ecosystem/slugs.json | jq '.slugs | length'
```

## Option B — Cloudflare Worker

For curl-vs-browser negotiation (raw install script vs GitHub HTML), use the reference worker in `edge/glitch-cards-router/worker.ts` and point Hostinger nameservers to Cloudflare.

## Private repo guard

`/dev-master` must **never** redirect to the private monorepo. Registry sends clients to `glitchworks-manifesto` only.
