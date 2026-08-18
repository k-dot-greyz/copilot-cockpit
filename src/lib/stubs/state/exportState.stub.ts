import type { TriageViewEntity } from '../../entities/triage-view';

/** @stub MOD-STATE-HYDRATION — deep link / persistence */
export function exportState(view: TriageViewEntity): string {
  return JSON.stringify(view);
}

/** @stub MOD-STATE-HYDRATION */
export function loadState(serialized: string): TriageViewEntity {
  throw new Error('[STUB] MOD-STATE-HYDRATION: validate schema before parse');
  return JSON.parse(serialized) as TriageViewEntity;
}
