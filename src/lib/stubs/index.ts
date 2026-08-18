/**
 * @stub MOD-INTERFACES
 * @dex_id 0x7D:0x12:MOD-INTERFACES
 * @follow_up_issue [MOD-INTERFACES] Implement polymorphic view contracts
 *
 * Planned contracts from CONTRIBUTING.md — move to src/lib/interfaces/ on implementation.
 */

export * from './interfaces/IAgentSurface.stub';
export * from './interfaces/IIssueSource.stub';
export * from './interfaces/ICommandGenerator.stub';
export * from './interfaces/IWorkflowCard.stub';

export * from './views/AgentMatrixView.stub';
export * from './views/IssueTriageView.stub';
export * from './views/BugFixPipelineView.stub';
export * from './views/ReleasePrepView.stub';

export * from './state/exportState.stub';
export * from './state/loadState.stub';

export * from './github/wire-hydrate-pipe.stub';
export * from './github/hydrate-pr-graphql.stub';

export * from './rep-mgmt/pr-hydration-review.stub';

/** Registry of all stub module IDs for dex pipeline indexing */
export const STUB_MODULE_IDS = [
  'MOD-WIRE-PIPE-HYDRATE',
  'MOD-PR-PARITY-SYNC',
  'MOD-DUPLICATES-UI',
  'MOD-INTERFACES',
  'MOD-STATE-HYDRATION',
  'MOD-VIEWS-AGENT-MATRIX',
  'MOD-VIEWS-ISSUE-TRIAGE',
  'MOD-VIEWS-BUG-FIX',
  'MOD-VIEWS-RELEASE-PREP',
  'MOD-DATA-STATIC',
  'MOD-REP-MGMT-REVIEW',
  'MOD-ENV-SECURE',
  'MOD-QUICKSTART-ORGANIC',
  'MOD-QUICKSTART-AGENTIC',
  'MOD-CI-GATES',
  'MOD-DEPLOY-VERCEL',
  'MOD-OAUTH-SERVERLESS',
  'MOD-LEGACY-RESCUE',
] as const;

export type StubModuleId = (typeof STUB_MODULE_IDS)[number];
