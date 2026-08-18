use serde::{Deserialize, Serialize};
use crate::stats::Stats;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct JobRequirements {
    pub str: u32,
    pub int: u32,
    pub chm: u32,
    pub krm: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Job {
    pub id: String,
    pub title: String,
    pub track: String,
    pub tier: u32,
    pub base_payout: u64,
    pub energy_cost: u32,
    pub hours: u32,
    pub requirements: JobRequirements,
}

impl Job {
    /// Check if player stats meet the job tier promotion requirements.
    pub fn is_eligible(&self, stats: &Stats) -> bool {
        stats.str_lvl >= self.requirements.str
            && stats.int_lvl >= self.requirements.int
            && stats.chm_lvl >= self.requirements.chm
            && stats.krm >= self.requirements.krm
    }

    /// Calculate shift payout factoring in primary stats, outfit, companion, and tarot modifiers.
    pub fn calculate_payout(
        &self,
        stats: &Stats,
        outfit_multiplier: f64,
        companion_multiplier: f64,
        tarot_multiplier: f64,
    ) -> u64 {
        let primary_stat = match self.track.as_str() {
            "fast_food" | "crime" => stats.str_lvl,
            "tech" | "finance" => stats.int_lvl,
            _ => stats.chm_lvl,
        };

        let stat_bonus = 1.0 + (primary_stat as f64 / 100.0);
        let total = (self.base_payout as f64)
            * stat_bonus
            * outfit_multiplier
            * companion_multiplier
            * tarot_multiplier;

        total.floor() as u64
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_job_eligibility() {
        let job = Job {
            id: "prompt_eng".into(),
            title: "Prompt Engineer".into(),
            track: "tech".into(),
            tier: 2,
            base_payout: 100,
            energy_cost: 20,
            hours: 4,
            requirements: JobRequirements {
                str: 1,
                int: 3,
                chm: 2,
                krm: 0,
            },
        };

        let mut stats = Stats::default();
        assert!(!job.is_eligible(&stats));

        stats.int_lvl = 3;
        stats.chm_lvl = 2;
        assert!(job.is_eligible(&stats));
    }

    #[test]
    fn test_payout_calculation() {
        let job = Job {
            id: "prompt_eng".into(),
            title: "Prompt Engineer".into(),
            track: "tech".into(),
            tier: 2,
            base_payout: 100,
            energy_cost: 20,
            hours: 4,
            requirements: JobRequirements { str: 1, int: 1, chm: 1, krm: 0 },
        };

        let mut stats = Stats::default();
        stats.int_lvl = 50; // +50% stat bonus

        let payout = job.calculate_payout(&stats, 1.5, 1.2, 1.0);
        // 100 * (1 + 0.5) * 1.5 * 1.2 * 1.0 = 100 * 1.5 * 1.5 * 1.2 = 270
        assert_eq!(payout, 270);
    }
}
