# Mechanic Specification: Consoomer Casino & Edging Mini-Game (`04_consoomer_casino.md`)

> **Module ID:** `hrpg-mechanic-casino-04`  
> **Status:** Active / MVP Spec  

---

## 1. Multiplier Ladder & Edging Mechanic

### 1.1 Bet Scaling & Escalation
- The player stakes a base bet $B \ge 10$.
- Each round $n$ (starting from $n = 1$), the player makes a binary guess (High/Low or Red/Black).
- **On Success:** Current Pot = $B \times 2^n$, and Degen score increases by $+15 \times n$.
- **On Cash Out:** The player banks the current pot and resets the edging ladder.
- **On Bust:** Pot is liquidated to 0. The player suffers the **"Existential Dread"** debuff (-20% INT XP gain for 24 game hours) and loses 10 Energy.

### 1.2 Bust Probability Formula
$$P(\text{bust} \mid n) = \min\left(0.15 + (n - 1) \times 0.08, 0.85\right)$$

---

## 2. JSON State Schema Reference

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CasinoRoundState",
  "type": "object",
  "required": ["base_bet", "current_pot", "round_number", "is_busted"],
  "properties": {
    "base_bet": { "type": "integer", "minimum": 10 },
    "current_pot": { "type": "integer", "minimum": 0 },
    "round_number": { "type": "integer", "minimum": 0 },
    "multiplier": { "type": "number", "minimum": 1.0 },
    "is_busted": { "type": "boolean" }
  }
}
```
