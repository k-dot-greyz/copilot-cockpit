# Mechanic Specification: Gacha, Outfits & Otome Harem (`03_gacha_harem_otome.md`)

> **Module ID:** `hrpg-mechanic-gacha-03`  
> **Status:** Active / MVP Spec  

---

## 1. Gacha Banner & Pity Algorithm

### 1.1 Pull Probabilities
- **SSR (Ultra Rare)**: Base 1.5%
- **SR (Super Rare)**: Base 28.5%
- **R (Rare)**: Base 70.0%

### 1.2 Soft & Hard Pity Rules
- **Soft Pity Threshold:** Pull 70. For every pull $> 70$, $\text{Rate}_{\text{SSR}} = 0.015 + ((\text{Pull} - 70) \times 0.05)$.
- **Hard Pity Threshold:** Pull 90 guarantees an SSR card.
- **50/50 Rule:** When an SSR is pulled:
  - If `guaranteed_featured == true`, the pulled card is guaranteed to be the banner's featured item, resetting `guaranteed_featured = false`.
  - Else, 50% chance of featured item. If lost, `guaranteed_featured` is set to `true` for the next SSR.

---

## 2. Outfit & Companion Card Schemas

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "OutfitCard",
  "type": "object",
  "required": ["id", "name", "rarity", "multipliers"],
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "rarity": { "type": "string", "enum": ["R", "SR", "SSR", "UR"] },
    "element": { "type": "string", "enum": ["void", "fire", "water", "aether"] },
    "multipliers": {
      "type": "object",
      "properties": {
        "str_buff": { "type": "number" },
        "int_buff": { "type": "number" },
        "chm_buff": { "type": "number" },
        "payout_buff": { "type": "number" }
      }
    }
  }
}
```
