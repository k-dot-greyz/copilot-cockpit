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

  it('ignores shortcuts when focus is in a textarea', () => {
    const textarea = { tagName: 'TEXTAREA' } as EventTarget;
    expect(
      shouldHandleRefreshShortcut('r', textarea, {
        isClosing: false,
        loading: false,
      })
    ).toBe(false);
  });

  it('does not trigger for keys other than r or R', () => {
    expect(
      shouldHandleRefreshShortcut('a', null, { isClosing: false, loading: false })
    ).toBe(false);
    expect(
      shouldHandleRefreshShortcut('Enter', null, { isClosing: false, loading: false })
    ).toBe(false);
    expect(
      shouldHandleRefreshShortcut(' ', null, { isClosing: false, loading: false })
    ).toBe(false);
  });

  it('blocks when both isClosing and loading are true simultaneously', () => {
    expect(
      shouldHandleRefreshShortcut('r', null, {
        isClosing: true,
        loading: true,
      })
    ).toBe(false);
  });

  it('allows refresh when target is a non-input element', () => {
    const button = { tagName: 'BUTTON' } as EventTarget;
    expect(
      shouldHandleRefreshShortcut('r', button, {
        isClosing: false,
        loading: false,
      })
    ).toBe(true);
  });
});
