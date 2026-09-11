import { describe, expect, it } from 'vitest';
import { getFocusWrapIndex } from './focus-trap';

describe('getFocusWrapIndex', () => {
  it('returns null when there are no focusable elements', () => {
    expect(getFocusWrapIndex(0, 0, false)).toBeNull();
    expect(getFocusWrapIndex(0, 0, true)).toBeNull();
    expect(getFocusWrapIndex(-1, 0, false)).toBeNull();
  });

  it('wraps both directions for a single focusable element', () => {
    expect(getFocusWrapIndex(0, 1, true)).toBe(0);
    expect(getFocusWrapIndex(0, 1, false)).toBe(0);
  });

  it('wraps shift+tab from first to last', () => {
    expect(getFocusWrapIndex(0, 3, true)).toBe(2);
    expect(getFocusWrapIndex(0, 5, true)).toBe(4);
  });

  it('wraps tab from last to first', () => {
    expect(getFocusWrapIndex(2, 3, false)).toBe(0);
    expect(getFocusWrapIndex(4, 5, false)).toBe(0);
  });

  it('returns null for interior indices', () => {
    expect(getFocusWrapIndex(1, 3, false)).toBeNull();
    expect(getFocusWrapIndex(1, 3, true)).toBeNull();
    expect(getFocusWrapIndex(2, 5, false)).toBeNull();
    expect(getFocusWrapIndex(3, 5, true)).toBeNull();
  });

  it('returns null when active index is out of bounds', () => {
    expect(getFocusWrapIndex(-1, 3, true)).toBeNull();
    expect(getFocusWrapIndex(-1, 3, false)).toBeNull();
    expect(getFocusWrapIndex(3, 3, false)).toBeNull();
    expect(getFocusWrapIndex(5, 3, true)).toBeNull();
  });
});
