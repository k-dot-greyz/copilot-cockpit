use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Stats {
    pub str_lvl: u32,
    pub str_xp: u32,
    pub int_lvl: u32,
    pub int_xp: u32,
    pub chm_lvl: u32,
    pub chm_xp: u32,
    pub krm: i32,
    pub dgn: u32,
}

impl Default for Stats {
    fn default() -> Self {
        Self {
            str_lvl: 1,
            str_xp: 0,
            int_lvl: 1,
            int_xp: 0,
            chm_lvl: 1,
            chm_xp: 0,
            krm: 0,
            dgn: 0,
        }
    }
}

impl Stats {
    /// Formula: XP_req(L) = floor(100 * L^1.65 + 50 * L)
    pub fn xp_required_for_level(level: u32) -> u32 {
        let l = level as f64;
        (100.0 * l.powf(1.65) + 50.0 * l).floor() as u32
    }

    /// Add XP to strength and level up if threshold reached.
    pub fn add_str_xp(&mut self, amount: u32) -> bool {
        self.str_xp += amount;
        let mut leveled_up = false;
        loop {
            let req = Self::xp_required_for_level(self.str_lvl);
            if self.str_xp >= req {
                self.str_xp -= req;
                self.str_lvl += 1;
                leveled_up = true;
            } else {
                break;
            }
        }
        leveled_up
    }

    /// Add XP to intelligence and level up if threshold reached.
    pub fn add_int_xp(&mut self, amount: u32) -> bool {
        self.int_xp += amount;
        let mut leveled_up = false;
        loop {
            let req = Self::xp_required_for_level(self.int_lvl);
            if self.int_xp >= req {
                self.int_xp -= req;
                self.int_lvl += 1;
                leveled_up = true;
            } else {
                break;
            }
        }
        leveled_up
    }

    /// Add XP to charm and level up if threshold reached.
    pub fn add_chm_xp(&mut self, amount: u32) -> bool {
        self.chm_xp += amount;
        let mut leveled_up = false;
        loop {
            let req = Self::xp_required_for_level(self.chm_lvl);
            if self.chm_xp >= req {
                self.chm_xp -= req;
                self.chm_lvl += 1;
                leveled_up = true;
            } else {
                break;
            }
        }
        leveled_up
    }

    /// Modify karma (-100 to 100 clamped)
    pub fn adjust_karma(&mut self, delta: i32) {
        self.krm = (self.krm + delta).clamp(-100, 100);
    }

    /// Modify degen score (0 to 10000 clamped)
    pub fn add_degen(&mut self, amount: u32) {
        self.dgn = (self.dgn + amount).min(10000);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_xp_scaling() {
        assert_eq!(Stats::xp_required_for_level(1), 150);
        assert!(Stats::xp_required_for_level(2) > 150);
    }

    #[test]
    fn test_level_up_progression() {
        let mut stats = Stats::default();
        let leveled = stats.add_str_xp(150);
        assert!(leveled);
        assert_eq!(stats.str_lvl, 2);
        assert_eq!(stats.str_xp, 0);
    }
}
