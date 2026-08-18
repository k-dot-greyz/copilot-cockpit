use serde::{Deserialize, Serialize};
use crate::player::PlayerState;

pub const BIT_CASH: u32 = 0x01;
pub const BIT_CRYPTO: u32 = 0x02;
pub const BIT_ENERGY: u32 = 0x04;
pub const BIT_STR_XP: u32 = 0x08;
pub const BIT_INT_XP: u32 = 0x10;
pub const BIT_CHM_XP: u32 = 0x20;
pub const BIT_DGN: u32 = 0x40;
pub const BIT_HOUR: u32 = 0x80;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SysExDeltaPayload {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cash: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub crypto: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub energy: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub str_xp: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub int_xp: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chm_xp: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dgn: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hour: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SysExDeltaPacket {
    pub header: String, // "0xF0" (dump) or "0xF7" (delta)
    pub bitmask: u32,
    pub timestamp: u64,
    pub payload: SysExDeltaPayload,
}

impl SysExDeltaPacket {
    /// Compute diff delta between previous and current state.
    pub fn compute_diff(prev: &PlayerState, curr: &PlayerState, timestamp: u64) -> Self {
        let mut bitmask = 0u32;
        let mut payload = SysExDeltaPayload {
            cash: None,
            crypto: None,
            energy: None,
            str_xp: None,
            int_xp: None,
            chm_xp: None,
            dgn: None,
            hour: None,
        };

        if curr.cash != prev.cash {
            bitmask |= BIT_CASH;
            payload.cash = Some(curr.cash);
        }
        if curr.crypto != prev.crypto {
            bitmask |= BIT_CRYPTO;
            payload.crypto = Some(curr.crypto);
        }
        if curr.energy != prev.energy {
            bitmask |= BIT_ENERGY;
            payload.energy = Some(curr.energy);
        }
        if curr.stats.str_xp != prev.stats.str_xp {
            bitmask |= BIT_STR_XP;
            payload.str_xp = Some(curr.stats.str_xp);
        }
        if curr.stats.int_xp != prev.stats.int_xp {
            bitmask |= BIT_INT_XP;
            payload.int_xp = Some(curr.stats.int_xp);
        }
        if curr.stats.chm_xp != prev.stats.chm_xp {
            bitmask |= BIT_CHM_XP;
            payload.chm_xp = Some(curr.stats.chm_xp);
        }
        if curr.stats.dgn != prev.stats.dgn {
            bitmask |= BIT_DGN;
            payload.dgn = Some(curr.stats.dgn);
        }
        if curr.hour != prev.hour {
            bitmask |= BIT_HOUR;
            payload.hour = Some(curr.hour);
        }

        Self {
            header: "0xF7".into(),
            bitmask,
            timestamp,
            payload,
        }
    }

    /// Hydrate target state from incoming delta.
    pub fn apply_to(&self, state: &mut PlayerState) {
        if self.bitmask & BIT_CASH != 0 {
            if let Some(val) = self.payload.cash {
                state.cash = val;
            }
        }
        if self.bitmask & BIT_CRYPTO != 0 {
            if let Some(val) = self.payload.crypto {
                state.crypto = val;
            }
        }
        if self.bitmask & BIT_ENERGY != 0 {
            if let Some(val) = self.payload.energy {
                state.energy = val;
            }
        }
        if self.bitmask & BIT_STR_XP != 0 {
            if let Some(val) = self.payload.str_xp {
                state.stats.str_xp = val;
            }
        }
        if self.bitmask & BIT_INT_XP != 0 {
            if let Some(val) = self.payload.int_xp {
                state.stats.int_xp = val;
            }
        }
        if self.bitmask & BIT_CHM_XP != 0 {
            if let Some(val) = self.payload.chm_xp {
                state.stats.chm_xp = val;
            }
        }
        if self.bitmask & BIT_DGN != 0 {
            if let Some(val) = self.payload.dgn {
                state.stats.dgn = val;
            }
        }
        if self.bitmask & BIT_HOUR != 0 {
            if let Some(val) = self.payload.hour {
                state.hour = val;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sysex_delta_diff_and_hydration() {
        let prev = PlayerState::default();
        let mut curr = prev.clone();
        curr.cash = 999;
        curr.energy = 80;

        let delta = SysExDeltaPacket::compute_diff(&prev, &curr, 123456);
        assert_eq!(delta.bitmask, BIT_CASH | BIT_ENERGY);
        assert_eq!(delta.payload.cash, Some(999));
        assert_eq!(delta.payload.energy, Some(80));

        let mut target = prev.clone();
        delta.apply_to(&mut target);
        assert_eq!(target.cash, 999);
        assert_eq!(target.energy, 80);
    }
}
