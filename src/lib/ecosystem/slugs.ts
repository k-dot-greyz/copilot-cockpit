/** glitch.cards public repo slug registry (served from /ecosystem/slugs.json). */
export type EcosystemSlug = {
  slug: string;
  aliases?: string[];
  repo: string;
  path_in_repo?: string;
  summary: string;
  redirect: string;
  hydration?: Record<string, string>;
  api_mounts?: string[];
};

export type EcosystemRegistry = {
  schema_version: number;
  host: string;
  updated: string;
  slugs: EcosystemSlug[];
};
