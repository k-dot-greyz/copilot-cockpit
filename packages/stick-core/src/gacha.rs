use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Rarity {
    R,
    SR,
    SSR,
    UR,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct GachaPityState {
    pub pulls_since_ssr: u32,
    pub guaranteed_featured: bool,
}

impl Default for GachaPityState {
    fn default() -> Self {
        Self {
            pulls_since_ssr: 0,
            guaranteed_featured: false,
        }
    }
}

pub struct GachaEngine;

impl GachaEngine {
    /// Compute current SSR probability given pity count.
    /// Base: 1.5% (0.015). Soft pity at pull 70 (+5% per pull). Hard pity at pull 90 (1.0).
    pub fn calculate_ssr_rate(pulls_since_ssr: u32) -> f64 {
        if pulls_since_ssr >= 90 {
            return 1.0;
        }
        if pulls_since_ssr < 70 {
            return 0.015;
        }
        let soft_step = pulls_since_ssr - 70;
        (0.015 + (soft_step as f64 * 0.05)).min(1.0)
    }

    /// Deterministic pull roll based on pseudo-RNG value in [0.0, 1.0).
    pub fn roll_rarity(pity: &mut GachaPityState, roll: f64) -> Rarity {
        pity.pulls_since_ssr += 1;
        let ssr_rate = Self::calculate_ssr_rate(pity.pulls_since_ssr);

        if roll < ssr_rate {
            pity.pulls_since_ssr = 0;
            Rarity::SSR
        } else if roll < ssr_rate + 0.285 {
            Rarity::SR
        } else {
            Rarity::R
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ssr_rate_curve() {
        assert_eq!(GachaEngine::calculate_ssr_rate(0), 0.015);
        assert_eq!(GachaEngine::calculate_ssr_rate(69), 0.015);
        assert!(GachaEngine::calculate_ssr_rate(75) > 0.015);
        assert_eq!(GachaEngine::calculate_ssr_rate(90), 1.0);
    }

    #[test]
    fn test_hard_pity_guarantee() {
        let mut pity = GachaPityState {
            pulls_since_ssr: 89,
            guaranteed_featured: false,
        };

        let result = GachaEngine::roll_rarity(&mut pity, 0.999);
        assert_eq!(result, Rarity::SSR);
        assert_eq!(pity.pulls_since_ssr, 0);
    }
}
