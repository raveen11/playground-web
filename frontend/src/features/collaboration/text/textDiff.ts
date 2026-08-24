/**
 * Text Diff
 * Pure helper that reduces two versions of a string to the single region that
 * changed between them.
 *
 * Whiteboard operations carry full content (`text.update`), so replacing an
 * editor's whole buffer on every remote operation would destroy the local
 * caret and selection. Applying only the changed span instead lets the editor
 * shift the caret the same way it does for a local edit.
 */

export type TextReplacement = {
  /** Offset in the old string where the replacement starts. */
  start: number;
  /** Offset in the old string where the replaced region ends (exclusive). */
  end: number;
  /** Text that takes the place of `[start, end)`. */
  text: string;
};

/**
 * Return the minimal replacement turning `previous` into `next`,
 * or `null` when the two strings are identical.
 */
export function diffText(previous: string, next: string): TextReplacement | null {
  if (previous === next) return null;

  const shortest = Math.min(previous.length, next.length);

  let start = 0;
  while (start < shortest && previous[start] === next[start]) {
    start += 1;
  }

  let previousEnd = previous.length;
  let nextEnd = next.length;
  while (
    previousEnd > start &&
    nextEnd > start &&
    previous[previousEnd - 1] === next[nextEnd - 1]
  ) {
    previousEnd -= 1;
    nextEnd -= 1;
  }

  return {
    start,
    end: previousEnd,
    text: next.slice(start, nextEnd),
  };
}
