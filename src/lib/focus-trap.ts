/**
 * Returns the index to focus when Tab should wrap at focus-trap boundaries,
 * or null if no wrap is needed.
 */
export function getFocusWrapIndex(
  activeIndex: number,
  focusableCount: number,
  shiftKey: boolean
): number | null {
  if (focusableCount <= 0) {
    return null;
  }

  const lastIndex = focusableCount - 1;

  if (shiftKey && activeIndex === 0) {
    return lastIndex;
  }

  if (!shiftKey && activeIndex === lastIndex) {
    return 0;
  }

  return null;
}
