function isTextInput(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') return false;
  const tag = (target as { tagName?: string }).tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA';
}

/**
 * Whether the refresh keyboard shortcut should trigger a PR reload.
 * Blocks refresh while typing in inputs or during destructive bulk-close.
 */
export function shouldHandleRefreshShortcut(
  key: string,
  target: EventTarget | null,
  options: { isClosing: boolean; loading: boolean }
): boolean {
  if (isTextInput(target)) {
    return false;
  }
  if (options.isClosing || options.loading) return false;
  return key === 'r' || key === 'R';
}
