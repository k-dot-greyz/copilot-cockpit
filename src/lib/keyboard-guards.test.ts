import { describe, expect, it } from 'vitest';
import { shouldHandleRefreshShortcut } from './keyboard-guards';

describe('shouldHandleRefreshShortcut', () => {
  it('allows R/r when idle', () => {
    expect(
      shouldHandleRefreshShortcut('R', null, {
        isClosing: false,
        loading: false,
      })
    ).toBe(true);
    expect(
      shouldHandleRefreshShortcut('r', null, {
        isClosing: false,
        loading: false,
      })
    ).toBe(true);
  });

  it('blocks refresh while bulk-close or fetch is in flight', () => {
    expect(
      shouldHandleRefreshShortcut('R', null, {
        isClosing: true,
        loading: false,
      })
    ).toBe(false);
    expect(
      shouldHandleRefreshShortcut('r', null, {
        isClosing: false,
        loading: true,
      })
    ).toBe(false);
  });

  it('ignores shortcuts when focus is in text inputs', () => {
    const input = { tagName: 'INPUT' } as EventTarget;
    expect(
      shouldHandleRefreshShortcut('r', input, {
        isClosing: false,
        loading: false,
      })
    ).toBe(false);
  });
});
