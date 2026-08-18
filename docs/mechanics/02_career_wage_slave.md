# Mechanic Specification: Career & Wage Slave Ladder (`02_career_wage_slave.md`)

> **Module ID:** `hrpg-mechanic-jobs-02`  
> **Status:** Active / MVP Spec  

---

## 1. Career Hierarchy & Shift Execution

### 1.1 Career Tracks
1. **Fast Food Service**: Primary stat `STR`, low pay, high fatigue drain.
2. **AI Prompt Engineering**: Primary stat `INT`, moderate pay, low fatigue drain, requires bootcamps.
3. **High Finance & Trading**: Primary stat `INT` + `DGN`, high variance pay, volatile bonuses.
4. **Crime Syndicate**: Primary stat `STR` + negative `KRM`, extreme payout, high bust risk.

### 1.2 Promotion Check
$$\text{PromoteReady} = (\text{STR} \ge \text{Req}_{\text{STR}}) \land (\text{INT} \ge \text{Req}_{\text{INT}}) \land (\text{CHM} \ge \text{Req}_{\text{CHM}}) \land (\text{Rep} \ge \text{Req}_{\text{Rep}})$$

### 1.3 Wage Calculation
$$\text{ShiftPayout} = \text{BaseSalary} \times \left(1 + \frac{\text{PrimaryStat}}{100}\right) \times \text{OutfitMultiplier} \times \text{CompanionMultiplier} \times \text{TarotResonance}$$

---

## 2. JSON Card Manifest Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "JobCard",
  "type": "object",
  "required": ["id", "title", "track", "tier", "base_payout", "energy_cost", "requirements"],
  "properties": {
    "id": { "type": "string" },
    "title": { "type": "string" },
    "track": { "type": "string", "enum": ["fast_food", "tech", "finance", "crime"] },
    "tier": { "type": "integer", "minimum": 1, "maximum": 5 },
    "base_payout": { "type": "integer", "minimum": 1 },
    "energy_cost": { "type": "integer", "minimum": 10, "maximum": 50 },
    "hours": { "type": "integer", "minimum": 1, "maximum": 8 },
    "requirements": {
      "type": "object",
      "properties": {
        "str": { "type": "integer" },
        "int": { "type": "integer" },
        "chm": { "type": "integer" },
        "krm": { "type": "integer" }
      }
    }
  }
}
```
