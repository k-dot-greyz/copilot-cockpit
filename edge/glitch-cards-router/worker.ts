/**
 * Reference Cloudflare Worker for glitch.cards (content negotiation).
 * Deploy separately; keep in sync with public/ecosystem/slugs.json + path-routes.json.
 */
export interface Env {}

const HTML_TARGETS: Record<string, string> = {
  "/env-doctor": "https://github.com/k-dot-greyz/env-doctor",
  "/zenos": "https://github.com/k-dot-greyz/zenOS",
  "/zenOS": "https://github.com/k-dot-greyz/zenOS",
  "/dev-master": "https://github.com/k-dot-greyz/glitchworks-manifesto",
  "/copilot-cockpit": "https://github.com/k-dot-greyz/copilot-cockpit",
  "/cockpit": "https://github.com/k-dot-greyz/copilot-cockpit",
};

const RAW_TARGETS: Record<string, string> = {
  "/env-doctor": "https://raw.githubusercontent.com/k-dot-greyz/env-doctor/main/env-doctor.sh",
  "/env-doctor/run": "https://raw.githubusercontent.com/k-dot-greyz/env-doctor/main/env-doctor.sh",
  "/zenos": "https://raw.githubusercontent.com/k-dot-greyz/zenOS/main/install.sh",
  "/zenOS": "https://raw.githubusercontent.com/k-dot-greyz/zenOS/main/install.sh",
  "/zenOS/install": "https://raw.githubusercontent.com/k-dot-greyz/zenOS/main/install.sh",
};

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";
    const accept = request.headers.get("accept") ?? "";
    const ua = request.headers.get("user-agent") ?? "";

    if (path.startsWith("/cards/dex/")) {
      const id = path.slice("/cards/dex/".length);
      const upstream = `https://raw.githubusercontent.com/k-dot-greyz/copilot-cockpit/main/dex/cards/${id}.json`;
      const res = await fetch(upstream);
      if (!res.ok) {
        return Response.json({ ok: false, error: "card_not_found" }, { status: 404 });
      }
      return new Response(res.body, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const isCli = ua.includes("curl") || ua.includes("Wget") || accept.includes("text/plain");
    const raw = RAW_TARGETS[path] ?? RAW_TARGETS[path.toLowerCase()];
    if (isCli && raw) {
      return Response.redirect(raw, 307);
    }

    const html = HTML_TARGETS[path] ?? HTML_TARGETS[path.toLowerCase()];
    if (html) {
      return Response.redirect(html, 308);
    }

    return Response.redirect("https://github.com/k-dot-greyz", 302);
  },
};
