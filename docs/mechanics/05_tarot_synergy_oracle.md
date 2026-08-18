# Mechanic Specification: Tarot Synergy & Oracle Divination (`05_tarot_synergy_oracle.md`)

> **Module ID:** `hrpg-mechanic-tarot-05`  
> **Status:** Active / Glitchworks-Tarot Module  

---

## 1. Daily 3-Card Spread Divination

Upon the start of each in-game day (or triggered via Oracle view `3`), a 3-card spread is drawn from the Glitchworks dynamic deck.

### 1.1 Elements & Resonances
- **Void (`void`)**: Unlocks high-risk volatility (Casino & Degen score multipliers).
- **Fire (`fire`)**: Boosts offensive stats, bouncer payouts, and physical work output.
- **Water (`water`)**: Enhances charm, visual novel dialogue options, and companion affinity rates.
- **Aether (`aether`)**: Boosts intelligence, crypto yields, and corporate promotion likelihood.

### 1.2 Active Card Modifiers
Each drawn card injects temporary stat buffs for that calendar day:
- `000 - The Fool`: +100% Degen gain, 2x Casino payout ceiling, -10% INT.
- `001 - The Magician`: +50% INT XP, -10% Energy cost on Prompting shifts.
- `002 - High Priestess`: +30% Charm, 2x Otome companion affinity gain.

---

## 2. JSON Tarot Card Manifest Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "TarotCard",
  "type": "object",
  "required": ["id", "name", "type", "stats", "desc"],
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "sub": { "type": "string" },
    "type": { "type": "string", "enum": ["void", "fire", "water", "aether"] },
    "stats": {
      "type": "object",
      "properties": {
        "atk": { "type": "integer" },
        "def": { "type": "integer" },
        "spd": { "type": "integer" }
      }
    },
    "desc": { "type": "string" },
    "icon": { "type": "string" }
  }
}
```
