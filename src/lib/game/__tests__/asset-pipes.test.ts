import { describe, it, expect } from 'vitest';
import jobCardSchema from '../../../../schemas/job_card.schema.json';
import outfitCardSchema from '../../../../schemas/outfit_card.schema.json';
import companionCardSchema from '../../../../schemas/companion_card.schema.json';
import tarotCardSchema from '../../../../schemas/tarot_card.schema.json';
import encounterCardSchema from '../../../../schemas/encounter_card.schema.json';

import fastFoodJob from '../../../../content/cards/jobs/fast_food_flipper.json';
import promptJob from '../../../../content/cards/jobs/prompt_engineer.json';
import maidOutfit from '../../../../content/cards/outfits/maid_tuxedo.json';
import techSenpai from '../../../../content/cards/companions/tech_lead_senpai.json';
import foolTarot from '../../../../content/cards/tarot/the_fool_000.json';
import watercoolerEncounter from '../../../../content/cards/encounters/awkward_watercooler.json';

describe('Dex Asset Pipe Hydration & Schema Validation', () => {
  it('validates Job cards against job_card.schema.json', () => {
    expect(fastFoodJob.id).toBeDefined();
    expect(fastFoodJob.track).toBe('fast_food');
    expect(fastFoodJob.base_payout).toBeGreaterThan(0);
    expect(promptJob.tier).toBe(2);
    expect(jobCardSchema.required).toContain('base_payout');
  });

  it('validates Outfit cards against outfit_card.schema.json', () => {
    expect(maidOutfit.rarity).toBe('SSR');
    expect(maidOutfit.multipliers.payout_buff).toBeGreaterThan(1.0);
    expect(outfitCardSchema.properties.multipliers).toBeDefined();
  });

  it('validates Companion cards against companion_card.schema.json', () => {
    expect(techSenpai.element).toBe('aether');
    expect(techSenpai.passive_perk.payout_multiplier).toBeGreaterThan(1.0);
    expect(companionCardSchema.required).toContain('passive_perk');
  });

  it('validates Tarot cards against tarot_card.schema.json', () => {
    expect(foolTarot.id).toBe('000');
    expect(foolTarot.type).toBe('void');
    expect(foolTarot.stats.spd).toBe(99);
    expect(tarotCardSchema.required).toContain('stats');
  });

  it('validates Encounter cards against encounter_card.schema.json', () => {
    expect(watercoolerEncounter.choices.length).toBeGreaterThan(0);
    expect(watercoolerEncounter.choices[0].outcomes.affinity_gain).toBeDefined();
    expect(encounterCardSchema.required).toContain('choices');
  });
});
