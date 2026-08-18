use serde::{Deserialize, Serialize};
use crate::stats::Stats;
use crate::gacha::GachaPityState;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Inventory {
    pub outfit_ids: Vec<String>,
    pub equipped_outfit_id: Option<String>,
    pub companion_ids: Vec<String>,
    pub active_companion_id: Option<String>,
    pub active_tarot_buffs: Vec<String>,
}

impl Default for Inventory {
    fn default() -> Self {
        Self {
            outfit_ids: vec!["outfit_tracksuit".into()],
            equipped_outfit_id: Some("outfit_tracksuit".into()),
            companion_ids: Vec::new(),
            active_companion_id: None,
            active_tarot_buffs: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PlayerState {
    pub id: String,
    pub name: String,
    pub day: u32,
    pub hour: u32,
    pub energy: u32,
    pub cash: u64,
    pub crypto: u64,
    pub stats: Stats,
    pub inventory: Inventory,
    pub pity: GachaPityState,
}

impl Default for PlayerState {
    fn default() -> Self {
        Self {
            id: "player_001".into(),
            name: "Cultured Consoomer".into(),
            day: 1,
            hour: 8,
            energy: 100,
            cash: 250,
            crypto: 0,
            stats: Stats::default(),
            inventory: Inventory::default(),
            pity: GachaPityState::default(),
        }
    }
}

impl PlayerState {
    /// Sleep and rest to reset energy, progress day, apply rent/interest.
    pub fn sleep(&mut self) {
        self.day += 1;
        self.hour = 8;
        self.energy = 100;

        // Passive daily rent expense
        if self.cash >= 25 {
            self.cash -= 25;
        } else {
            self.cash = 0;
        }
    }

    /// Advance time in hours, capping energy.
    pub fn advance_time(&mut self, hours: u32, energy_drain: u32) {
        self.hour = (self.hour + hours) % 24;
        self.energy = self.energy.saturating_sub(energy_drain);
    }
}
