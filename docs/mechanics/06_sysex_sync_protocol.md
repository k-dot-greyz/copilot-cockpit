# Mechanic Specification: SysEx-Inspired State Streaming Protocol (`06_sysex_sync_protocol.md`)

> **Module ID:** `hrpg-mechanic-sync-06`  
> **Status:** Active / MVP Spec  

---

## 1. Protocol Overview

The protocol uses MIDI 2.0 / SysEx concepts:
- **`0xF0 SysExDump`**: Full state synchronization (Handshake & Session Reconnect).
- **`0xF7 SysExDelta`**: Bitmask-indexed sparse delta payload (Tick & Action updates).

### 1.1 Bitmask Field Allocation
```
Bit 0 (0x01) -> Cash (u64)
Bit 1 (0x02) -> Crypto (u64)
Bit 2 (0x04) -> Energy (u8)
Bit 3 (0x08) -> STR XP (u32)
Bit 4 (0x10) -> INT XP (u32)
Bit 5 (0x20) -> CHM XP (u32)
Bit 6 (0x40) -> DGN Score (u32)
Bit 7 (0x80) -> World Hour (u8)
Bit 8 (0x100) -> Active Tarot Buffs
```

---

## 2. JSON Schema for SysEx Packets

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SysExDeltaPacket",
  "type": "object",
  "required": ["header", "bitmask", "timestamp", "payload"],
  "properties": {
    "header": { "type": "string", "enum": ["0xF0", "0xF7"] },
    "bitmask": { "type": "integer" },
    "timestamp": { "type": "integer" },
    "payload": { "type": "object" }
  }
}
```
