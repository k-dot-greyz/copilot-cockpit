import { describe, expect, it } from 'vitest';
import { loadDemoPrs } from './demo-board';
import { categorizePRs, findDuplicates } from '../triage';

describe('loadDemoPrs', () => {
  it('hydrates every lane plus a duplicate cluster without GitHub', () => {
    const prs = loadDemoPrs();
    const cats = categorizePRs(prs);
    expect(cats['bot-flood'].length).toBe(10);
    expect(cats['human-ready'].length).toBe(1);
    expect(cats['human-draft'].length).toBe(1);
    expect(cats['bot-tests'].length).toBeGreaterThan(0);
    expect(cats.external.length).toBe(1);
    expect(findDuplicates(prs).some((c) => c.title === 'test(coverage): shield')).toBe(true);
  });
});
