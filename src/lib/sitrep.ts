/**
 * Dep and Tooling Sitrep evaluation engine
 * Formats and inspects system tools and repo/nightly dependencies
 * for deterministic reporting in CI and runtime CLI/UI.
 */

export interface ToolStatus {
  name: string;
  command: string;
  version: string | null;
  channel: 'release stable' | 'custom' | 'missing';
  healthy: boolean;
}

export interface RepoStatus {
  name: string;
  sha: string | null;
  date: string | null;
  channel: 'nightly/head' | 'unavailable';
  healthy: boolean;
}

export interface SitrepReport {
  tools: ToolStatus[];
  repos: RepoStatus[];
  allRequiredHealthy: boolean;
  timestamp: string;
}

export function parseToolVersion(
  name: string,
  rawOutput: string | null,
  options: { required?: boolean } = {}
): ToolStatus {
  if (!rawOutput || rawOutput.trim().length === 0) {
    return {
      name,
      command: name.toLowerCase(),
      version: null,
      channel: 'missing',
      healthy: options.required ? false : true,
    };
  }

  const firstLine = rawOutput.trim().split('\n')[0].trim();
  return {
    name,
    command: name.toLowerCase(),
    version: firstLine,
    channel: 'release stable',
    healthy: true,
  };
}

export function parseRepoStatus(
  name: string,
  gitInfo: { sha?: string | null; date?: string | null } | null,
  options: { required?: boolean } = {}
): RepoStatus {
  if (!gitInfo || !gitInfo.sha) {
    return {
      name,
      sha: null,
      date: null,
      channel: 'unavailable',
      healthy: options.required ? false : true,
    };
  }

  return {
    name,
    sha: gitInfo.sha.trim().slice(0, 7),
    date: gitInfo.date ? gitInfo.date.trim() : null,
    channel: 'nightly/head',
    healthy: true,
  };
}

export function formatSitrepText(report: SitrepReport): string {
  const lines: string[] = [];
  lines.push('┌── zenOS Dep & Tooling Sitrep ───────────────────────────────');

  for (const tool of report.tools) {
    const ver = tool.version || 'missing';
    const tag = tool.healthy
      ? `[${tool.channel}]`
      : `[not installed]`;
    lines.push(
      `  ${tool.name.padEnd(18)} ${ver.padEnd(32)} ${tag}`
    );
  }

  lines.push('├─────────────────────────────────────────────────────────────');

  for (const repo of report.repos) {
    if (repo.healthy && repo.sha) {
      const dateStr = repo.date ? `(${repo.date})` : '';
      const revStr = `rev ${repo.sha}`.padEnd(12);
      lines.push(
        `  ${repo.name.padEnd(18)} ${revStr}  ${dateStr.padEnd(12)}  [${repo.channel}]`
      );
    } else {
      lines.push(
        `  ${repo.name.padEnd(18)} missing                [${repo.channel}]`
      );
    }
  }

  lines.push('└─────────────────────────────────────────────────────────────');
  return lines.join('\n');
}
