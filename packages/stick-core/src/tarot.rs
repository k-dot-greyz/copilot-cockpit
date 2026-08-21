use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TarotCard {
    pub id: String,
    pub name: String,
    pub element: String,
    pub atk_stat: u32,
    pub def_stat: u32,
    pub spd_stat: u32,
    pub desc: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
pub struct TarotSpreadModifier {
    pub salary_multiplier: f64,
    pub xp_multiplier: f64,
    pub degen_multiplier: f64,
    pub energy_cost_discount: f64,
}

impl TarotCard {
    /// Calculate modifiers for a given 3-card spread
    pub fn compute_spread_buffs(cards: &[TarotCard]) -> TarotSpreadModifier {
        let mut modifier = TarotSpreadModifier {
            salary_multiplier: 1.0,
            xp_multiplier: 1.0,
            degen_multiplier: 1.0,
            energy_cost_discount: 0.0,
        };

        for card in cards {
            match card.id.as_str() {
                "000" => {
                    // The Fool
                    modifier.degen_multiplier += 1.0;
                }
                "001" => {
                    // The Magician
                    modifier.xp_multiplier += 0.5;
                    modifier.energy_cost_discount += 0.1;
                }
                "002" => {
                    // High Priestess
                    modifier.salary_multiplier += 0.3;
                }
                _ => {}
            }
        }

        modifier
    }
}
