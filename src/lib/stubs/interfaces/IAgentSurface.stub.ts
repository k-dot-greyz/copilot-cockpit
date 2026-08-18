/**
 * @stub MOD-INTERFACES
 * Agent surface catalog entry — keyboard view `1`
 */
export interface IAgentSurface {
  id: string;
  name: string;
  tier: 'free' | 'pro' | 'pro+';
  capability: string;
}

export function listAgentSurfaces(): IAgentSurface[] {
  throw new Error('[STUB] MOD-VIEWS-AGENT-MATRIX: implement listAgentSurfaces');
}
