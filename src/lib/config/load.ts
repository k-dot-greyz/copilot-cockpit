import configJson from '../../../content/cockpit/config.json' with { type: 'json' };
import humanReady from '../../../content/cockpit/lanes/human-ready.json' with { type: 'json' };
import humanDraft from '../../../content/cockpit/lanes/human-draft.json' with { type: 'json' };
import botTests from '../../../content/cockpit/lanes/bot-tests.json' with { type: 'json' };
import botOther from '../../../content/cockpit/lanes/bot-other.json' with { type: 'json' };
import external from '../../../content/cockpit/lanes/external.json' with { type: 'json' };
import botFlood from '../../../content/cockpit/lanes/bot-flood.json' with { type: 'json' };
import refresh from '../../../content/cockpit/actions/refresh.json' with { type: 'json' };
import nukeFlood from '../../../content/cockpit/actions/nuke-flood.json' with { type: 'json' };
import closeSelected from '../../../content/cockpit/actions/close-selected.json' with { type: 'json' };
import selectDuplicates from '../../../content/cockpit/actions/select-duplicate-copies.json' with { type: 'json' };
import { parseCockpit, type CockpitConfig, type ParsedCockpit } from './cockpit';

export const TARGET_OVERRIDE_KEY = 'cockpit-target-override';

export function loadDefaultCockpit(targetOverride?: { owner: string; repo: string } | null): ParsedCockpit {
  return parseCockpit({
    config: configJson as CockpitConfig,
    lanes: [humanReady, humanDraft, botTests, botOther, external, botFlood],
    actions: [refresh, nukeFlood, closeSelected, selectDuplicates],
    targetOverride,
  });
}

export const defaultCockpit = loadDefaultCockpit();
