import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import type { EcosystemRegistry } from "./slugs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const registry: EcosystemRegistry = JSON.parse(
  readFileSync(join(root, "public/ecosystem/slugs.json"), "utf8"),
);

describe("glitch.cards ecosystem slugs", () => {
  it("has unique slugs and valid redirect URLs", () => {
    const seen = new Set<string>();
    for (const entry of registry.slugs) {
      expect(seen.has(entry.slug)).toBe(false);
      seen.add(entry.slug);
      expect(entry.redirect).toMatch(/^https:\/\//);
      expect(entry.repo).toMatch(/^k-dot-greyz\//);
      for (const alias of entry.aliases ?? []) {
        expect(alias).toMatch(/^[a-z0-9-]+$/i);
      }
    }
  });

  it("includes env-doctor and zenOS entry points", () => {
    const slugs = new Set(registry.slugs.map((s) => s.slug));
    expect(slugs.has("env-doctor")).toBe(true);
    expect(slugs.has("zenOS")).toBe(true);
  });
});
