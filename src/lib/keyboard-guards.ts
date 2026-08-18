function isTextInput(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') return false;

  // Allow shortcuts on checkboxes, radios, buttons, etc.
  if (target instanceof HTMLTextAreaElement) return true;

  if (target instanceof HTMLInputElement) {
    const textLikeTypes = ['text', 'password', 'email', 'search', 'tel', 'url', 'number'];
    return textLikeTypes.includes(target.type);
  }

  return false;
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
