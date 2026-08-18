import { describe, expect, it } from 'vitest';
import {
  formatSitrepText,
  parseRepoStatus,
  parseToolVersion,
  type SitrepReport,
} from './sitrep';

describe('sitrep evaluation engine', () => {
  describe('parseToolVersion', () => {
    it('handles happy path with clean version output', () => {
      const tool = parseToolVersion('Node.js', 'v22.14.0\n');
      expect(tool).toEqual({
        name: 'Node.js',
        command: 'node.js',
        version: 'v22.14.0',
        channel: 'release stable',
        healthy: true,
      });
    });

    it('handles multiline version output by picking the first line', () => {
      const tool = parseToolVersion(
        'GitHub CLI',
        'gh version 2.91.0 (2026-04-22)\nhttps://github.com/cli/cli'
      );
      expect(tool.version).toBe('gh version 2.91.0 (2026-04-22)');
      expect(tool.healthy).toBe(true);
    });

    it('marks optional missing tools as channel=missing but healthy=true', () => {
      const tool = parseToolVersion('Docker', null, { required: false });
      expect(tool).toEqual({
        name: 'Docker',
        command: 'docker',
        version: null,
        channel: 'missing',
        healthy: true,
      });
    });

    it('marks required missing tools as channel=missing and healthy=false', () => {
      const tool = parseToolVersion('Node.js', '', { required: true });
      expect(tool.healthy).toBe(false);
      expect(tool.channel).toBe('missing');
    });
  });

  describe('parseRepoStatus', () => {
    it('extracts 7-char short SHA and commit date for healthy git clones', () => {
      const repo = parseRepoStatus('env-doctor', {
        sha: 'aa006ca1234567890',
        date: '2026-08-18',
      });
      expect(repo).toEqual({
        name: 'env-doctor',
        sha: 'aa006ca',
        date: '2026-08-18',
        channel: 'nightly/head',
        healthy: true,
      });
    });

    it('handles missing/ablation repo fallback', () => {
      const repo = parseRepoStatus('git-butler', null, { required: false });
      expect(repo).toEqual({
        name: 'git-butler',
        sha: null,
        date: null,
        channel: 'unavailable',
        healthy: true,
      });
    });

    it('marks required repo missing as healthy=false', () => {
      const repo = parseRepoStatus('env-doctor', null, { required: true });
      expect(repo.healthy).toBe(false);
      expect(repo.channel).toBe('unavailable');
    });
  });

  describe('formatSitrepText', () => {
    it('formats aligned visual sitrep table with release stable and nightly/head tags', () => {
      const report: SitrepReport = {
        tools: [
          parseToolVersion('Node.js', 'v22.14.0'),
          parseToolVersion('npm', '10.9.7'),
          parseToolVersion('Docker', null, { required: true }),
        ],
        repos: [
          parseRepoStatus('env-doctor', { sha: 'aa006ca', date: '2026-08-18' }),
          parseRepoStatus('dinit', null, { required: false }),
        ],
        allRequiredHealthy: false,
        timestamp: '2026-08-18T11:00:00Z',
      };

      const table = formatSitrepText(report);
      expect(table).toContain('Node.js');
      expect(table).toContain('[release stable]');
      expect(table).toContain('Docker');
      expect(table).toContain('[not installed]');
      expect(table).toContain('env-doctor');
      expect(table).toContain('[nightly/head]');
      expect(table).toContain('dinit');
      expect(table).toContain('[unavailable]');
    });
  });
});
