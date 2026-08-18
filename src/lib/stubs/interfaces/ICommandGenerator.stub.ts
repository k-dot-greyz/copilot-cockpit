/**
 * @stub MOD-INTERFACES
 * Copilot assignment command generation
 */
export interface ICommandGenerator {
  generateAssignCommand(issueNumber: number, agent: string): string;
}

export function createCommandGenerator(): ICommandGenerator {
  throw new Error('[STUB] MOD-DATA-STATIC: implement createCommandGenerator');
}
