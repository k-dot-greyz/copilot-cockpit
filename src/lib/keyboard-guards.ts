function isTextInput(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object') return false;
  const el = target as { tagName?: string; type?: string; isContentEditable?: boolean };
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'TEXTAREA') return true;
  if (tag === 'SELECT') return true;
  if (tag !== 'INPUT') return false;
  const type = (el.type ?? 'text').toLowerCase();
  const nonText = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'image', 'hidden', 'range', 'color']);
  return !nonText.has(type);
}

/**
 * Whether the refresh keyboard shortcut should trigger a PR reload.
 * Blocks refresh while typing in text fields or during destructive bulk-close.
 * Checkbox / radio / button inputs do not count as text.
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

export { isTextInput };
