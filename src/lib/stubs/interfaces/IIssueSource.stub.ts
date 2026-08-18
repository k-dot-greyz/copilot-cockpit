/**
 * @stub MOD-INTERFACES
 * Issue data source — keyboard view `2`
 */
export interface IIssue {
  number: number;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface IIssueSource {
  fetchOpenIssues(owner: string, repo: string): Promise<IIssue[]>;
}

export function createIssueSource(): IIssueSource {
  throw new Error('[STUB] MOD-VIEWS-ISSUE-TRIAGE: implement createIssueSource');
}
