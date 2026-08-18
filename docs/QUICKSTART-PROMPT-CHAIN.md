# Universal Card Engine Quickstart & Prompt Chain (`QUICKSTART-PROMPT-CHAIN.md`)

> **Atelier / StickHRPG Entity Card Generator & Scaffold Prompt Chain**  
> Use this prompt chain to instantly generate valid, tightly scoped JSON card manifests for any otome / harem / life-sim game fork repository.

---

## 1. System Prompt for Autonomous Card Generation

When prompting AI agents or subagents to create new game cards (Outfits, Companions, Scenes, Actions, Encounters, Mechanics), provide this baseline instruction block:

```markdown
You are the Atelier Card Manifest Engine. You construct canonical JSON entity cards adhering strictly to the `base_entity_card.schema.json` format and its type-specific sub-schemas (`scene_card`, `action_card`, `outfit_card`, `companion_card`, `mechanic_config_card`).

### Foundational Schema Constraints:
1. Every card MUST define:
   - `card_id`: Namespaced string `"<type>:<slug>"` (e.g., `"companion:goth_hacker"`, `"scene:nightclub_district"`).
   - `schema_version`: `"2026-08.1-mvp++"`.
   - `dex_id`: Valid zenOS dex register string (e.g., `"0x7D:0x21:DEX-ASSET-<MODULE>"`).
   - `card_type`: One of `["game_object", "scene", "action", "mechanic", "job", "outfit", "companion", "tarot", "encounter", "relic", "config"]`.
   - `slug`: Snake_case lowercase alphanumeric string.
   - `status`: `"active" | "draft" | "locked"`.
   - `tier`: Integer 0 to 5.
   - `element`: `"neutral" | "void" | "fire" | "water" | "aether"`.
   - `rarity`: `"COMMON" | "R" | "SR" | "SSR" | "UR"`.
   - `tags`: Unique array of string labels.
   - `meta`: Object with `author`, `created_at` (ISO 8601), `sync_hash` (SHA-256), and boolean `flags`.
   - `params`: Tightly-scoped parameter object matching the specific schema.

2. Enforce strictly bounded numeric parameters:
   - Energy costs: 0 to 100
   - Multipliers: >= 1.0
   - Drop probabilities: 0.0 to 1.0 (Summing correctly)
   - Pity thresholds: 70 to 90
   - Karma bounds: -100 to +100
   - Degen bounds: 0 to 10000
```

---

## 2. Multi-Turn Quickstart Prompt Chain

### Step 1: Ingest Lore & Archetype
**Prompt:**
> "I am creating a new [Companion / Outfit / Scene / Action / Mechanic] for [Theme/Setting]. The concept is: [Describe archetype, personality, stats, background lore]. Generate the canonical JSON card manifest following `base_entity_card.schema.json`."

### Step 2: Validate Parameter Scoping & Math Balance
**Prompt:**
> "Review the generated `params` block. Verify that all stat checks, energy costs, payout curves, and rarity drop rates align with `docs/mechanics/` math specifications. Output the final valid JSON file to `content/cards/<type>/<slug>.json`."

### Step 3: Register in Dex Catalog & Asset Pipes
**Prompt:**
> "Add the newly generated card to `dex/cards/index.json` under its relevant asset pipe and generate a Vitest verification test in `src/lib/game/__tests__/asset-pipes.test.ts`."

---

## 3. Example Prompt Output Target

```json
{
  "card_id": "companion:goth_barista_hacker",
  "schema_version": "2026-08.1-mvp++",
  "dex_id": "0x7D:0x21:DEX-ASSET-COMPANIONS",
  "card_type": "companion",
  "slug": "goth_barista_hacker",
  "title": "Morgana Void",
  "status": "active",
  "tier": 3,
  "element": "void",
  "rarity": "SSR",
  "tags": ["goth", "barista", "hacker", "coffee", "cyberpunk"],
  "meta": {
    "author": "quickstart-chain",
    "created_at": "2026-08-18T15:30:00Z",
    "sync_hash": "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "flags": {
      "is_gacha_pullable": true,
      "is_story_locked": false,
      "is_tradeable": false,
      "is_consumable": false,
      "is_unique": true
    }
  },
  "params": {
    "title": "Goth Barista & Zero-Day Exploit Broker",
    "affinity_level": 50,
    "bio": "Pours triple-shot obsidian cold brews while reverse-engineering military-grade firewalls under the counter.",
    "passive_perk": {
      "name": "Caffeine-Overclocked Zero-Day",
      "payout_multiplier": 1.45,
      "xp_multiplier": 1.60,
      "energy_reduction": 10
    }
  }
}
```
