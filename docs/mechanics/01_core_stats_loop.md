# Mechanic Specification: Core Stats & Progression Loop (`01_core_stats_loop.md`)

> **Module ID:** `hrpg-mechanic-stats-01`  
> **Status:** Active / MVP Spec  

---

## 1. Overview & Core Mathematical Formulas

The player manages five core attributes, two energy/fatigue meters, and two currencies (Fiat Cash & Crypto).

### 1.1 Attributes
| Attribute | Code | Primary Activity | High Value Benefit |
|---|---|---|---|
| **Strength** | `STR` | Gym, Underground Brawl | Bouncer Gigs, Combat DPS, Intimidation checks |
| **Intelligence** | `INT` | Bootcamp, Reading | Prompt Engineering, Hacking, Day-Trading yield |
| **Charm** | `CHM` | Bar flirting, Styling | Corporate promotions, Otome romance success |
| **Karma** | `KRM` | Charity vs. Petty Crime | Aligns with Saint or Syndicate ending routes |
| **Degen** | `DGN` | Gacha pulls, Casino spins | Unlocks Fever Mode, VIP high-stakes tables |

### 1.2 XP Progression Formula
$$\text{XP}_{\text{required}}(L) = \lfloor 100 \times L^{1.65} + 50 \times L \rfloor$$

### 1.3 Level Derivation
Given cumulative $\text{XP}_{\text{total}}$, the level $L$ is computed deterministically until remaining XP is less than $\text{XP}_{\text{required}}(L)$.

---

## 2. JSON Manifest Schema Reference

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "PlayerStatsState",
  "type": "object",
  "required": ["str", "int", "chm", "krm", "dgn", "energy"],
  "properties": {
    "str": { "type": "integer", "minimum": 1 },
    "str_xp": { "type": "integer", "minimum": 0 },
    "int": { "type": "integer", "minimum": 1 },
    "int_xp": { "type": "integer", "minimum": 0 },
    "chm": { "type": "integer", "minimum": 1 },
    "chm_xp": { "type": "integer", "minimum": 0 },
    "krm": { "type": "integer", "minimum": -100, "maximum": 100 },
    "dgn": { "type": "integer", "minimum": 0, "maximum": 10000 },
    "energy": { "type": "integer", "minimum": 0, "maximum": 100 }
  }
}
```
