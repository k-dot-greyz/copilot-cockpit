import { describe, it, expect } from 'vitest';
import { extractIssueRefs, timeAgo } from './triage';

describe('triage utilities', () => {
  describe('extractIssueRefs', () => {
    it('should extract single issue reference', () => {
      const title = 'fix(cockpit): resolve bug #123';
      expect(extractIssueRefs(title)).toEqual([123]);
    });

    it('should extract multiple issue references', () => {
      const title = 'feat: implement features #456 and #789';
      expect(extractIssueRefs(title)).toEqual([456, 789]);
    });

    it('should return empty array when no references found', () => {
      const title = 'chore: clean up some code';
      expect(extractIssueRefs(title)).toEqual([]);
    });
  });

  describe('timeAgo', () => {
    it('should return relative time description', () => {
      const now = new Date();
      // Test with recent date (e.g. 5 minutes ago)
      const fiveMinsAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
      expect(timeAgo(fiveMinsAgo)).toContain('ago');
    });
  });
});
