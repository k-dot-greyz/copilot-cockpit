import { describe, it, expect } from 'vitest';
import baseEntitySchema from '../../../../schemas/base_entity_card.schema.json';
import sceneCardSchema from '../../../../schemas/scene_card.schema.json';
import actionCardSchema from '../../../../schemas/action_card.schema.json';
import mechanicConfigSchema from '../../../../schemas/mechanic_config_card.schema.json';
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
import templateScene from '../../../../content/cards/templates/template_scene_card.json';
import templateAction from '../../../../content/cards/templates/template_action_card.json';
import templateMechanic from '../../../../content/cards/templates/template_mechanic_config.json';

describe('Dex Asset Pipe Hydration & Schema Validation', () => {
  it('validates foundational BaseEntityCard schema contracts', () => {
    expect(baseEntitySchema.required).toContain('card_id');
    expect(baseEntitySchema.required).toContain('dex_id');
    expect(baseEntitySchema.required).toContain('meta');
    expect(baseEntitySchema.required).toContain('params');
  });

  it('validates Scene card templates against scene_card.schema.json', () => {
    expect(templateScene.card_type).toBe('scene');
    expect(templateScene.params.district).toBe('downtown_slums');
    expect(templateScene.params.bg_style.crt_flicker_intensity).toBeGreaterThanOrEqual(0);
    expect(sceneCardSchema.properties.params.required).toContain('spawn_table');
  });

  it('validates Action card templates against action_card.schema.json', () => {
    expect(templateAction.card_type).toBe('action');
    expect(templateAction.params.action_category).toBe('work');
    expect(templateAction.params.payout_formula.base_amount).toBeGreaterThan(0);
    expect(actionCardSchema.properties.params.required).toContain('stat_checks');
  });

  it('validates Mechanic Config card templates against mechanic_config_card.schema.json', () => {
    expect(templateMechanic.card_type).toBe('mechanic');
    expect(templateMechanic.params.gacha_math.soft_pity_start_pull).toBe(70);
    expect(templateMechanic.params.gacha_math.hard_pity_pull_cap).toBe(90);
    expect(mechanicConfigSchema.properties.params.required).toContain('casino_edging');
  });

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
