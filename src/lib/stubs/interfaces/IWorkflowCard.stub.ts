/**
 * @stub MOD-INTERFACES
 * Workflow card payload for Bug Fix / Release Prep views
 */
export interface IWorkflowCard {
  id: string;
  title: string;
  steps: { label: string; command?: string }[];
}

export function loadWorkflowCard(id: string): IWorkflowCard {
  throw new Error(`[STUB] MOD-DATA-STATIC: loadWorkflowCard(${id})`);
}
