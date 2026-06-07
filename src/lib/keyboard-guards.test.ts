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

  it('ignores shortcuts when focus is in a TEXTAREA', () => {
    const textarea = { tagName: 'TEXTAREA' } as EventTarget;
    expect(
      shouldHandleRefreshShortcut('r', textarea, {
        isClosing: false,
        loading: false,
      })
    ).toBe(false);
    expect(
      shouldHandleRefreshShortcut('R', textarea, {
        isClosing: false,
        loading: false,
      })
    ).toBe(false);
  });

  it('rejects keys other than R/r even when idle and no input focused', () => {
    expect(
      shouldHandleRefreshShortcut('s', null, { isClosing: false, loading: false })
    ).toBe(false);
    expect(
      shouldHandleRefreshShortcut('Enter', null, { isClosing: false, loading: false })
    ).toBe(false);
    expect(
      shouldHandleRefreshShortcut(' ', null, { isClosing: false, loading: false })
    ).toBe(false);
    expect(
      shouldHandleRefreshShortcut('F5', null, { isClosing: false, loading: false })
    ).toBe(false);
  });

  it('blocks when both isClosing and loading are true', () => {
    expect(
      shouldHandleRefreshShortcut('r', null, { isClosing: true, loading: true })
    ).toBe(false);
  });

  it('does not block for non-element targets (e.g., document)', () => {
    // A target without tagName (e.g. window or document body when not INPUT/TEXTAREA)
    const bodyTarget = { tagName: 'DIV' } as EventTarget;
    expect(
      shouldHandleRefreshShortcut('r', bodyTarget, { isClosing: false, loading: false })
    ).toBe(true);
  });
});
