#!/usr/bin/env node
/**
 * Merge public/ecosystem/slugs.json + path-routes.json into vercel.json redirects/rewrites.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const vercelPath = join(root, "vercel.json");
const slugs = JSON.parse(readFileSync(join(root, "public/ecosystem/slugs.json"), "utf8"));
const paths = JSON.parse(readFileSync(join(root, "public/ecosystem/path-routes.json"), "utf8"));

const redirects = [];

for (const entry of slugs.slugs) {
  const names = [entry.slug, ...(entry.aliases ?? [])];
  for (const name of names) {
    redirects.push({ source: `/${name}`, destination: entry.redirect, permanent: false });
    redirects.push({ source: `/${name}/`, destination: entry.redirect, permanent: false });
  }
}

for (const rule of paths.redirects) {
  redirects.push({ source: rule.source, destination: rule.destination, permanent: false });
  if (!rule.source.endsWith("/")) {
    redirects.push({ source: `${rule.source}/`, destination: rule.destination, permanent: false });
  }
}

const rewrites = paths.rewrites.map((r) => ({ source: r.source, destination: r.destination }));

const base = JSON.parse(readFileSync(vercelPath, "utf8"));
base.redirects = redirects;
base.rewrites = rewrites;
base.headers = [
  {
    source: "/ecosystem/(.*)",
    headers: [{ key: "Cache-Control", value: "public, max-age=300, stale-while-revalidate=600" }],
  },
  {
    source: "/cards/(.*)",
    headers: [
      { key: "Cache-Control", value: "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" },
      { key: "Access-Control-Allow-Origin", value: "*" },
      { key: "X-Content-Type-Options", value: "nosniff" },
    ],
  },
  {
    source: "/.well-known/(.*)",
    headers: [
      { key: "Cache-Control", value: "public, max-age=300, s-maxage=3600" },
      { key: "Access-Control-Allow-Origin", value: "*" },
    ],
  },
];

writeFileSync(vercelPath, `${JSON.stringify(base, null, 2)}\n`);
console.log(`vercel.json: ${redirects.length} redirects, ${rewrites.length} rewrites`);
