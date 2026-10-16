/** Horizontal distance in pixels a swipe needs to count as a grade (FR-FC-2). */
export const SWIPE_THRESHOLD_PX = 60;

/** The self-grade of a flashcard. */
export type FlashcardGrade = "correct" | "wrong";

/**
 * Maps a horizontal swipe to a grade: right = "I knew it", left = "Not yet" (FR-FC-2).
 *
 * @param deltaX Horizontal movement in pixels; positive is to the right.
 * @param deltaY Vertical movement in pixels; mostly vertical gestures are scrolls and ignored.
 * @returns The grade, or `null` when the movement is too short or too vertical.
 */
export function gradeFromSwipe(
  deltaX: number,
  deltaY: number,
): FlashcardGrade | null {
  if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) {
    return null;
  }
  if (Math.abs(deltaY) > Math.abs(deltaX)) {
    return null;
  }
  return deltaX > 0 ? "correct" : "wrong";
}

/**
 * Maps a key to a flashcard action (FR-FC-1, FR-FC-2).
 *
 * @param key A `KeyboardEvent.key` value.
 * @returns `flip` for Space, a grade for Right/2 and Left/1, otherwise `null`.
 */
export function flashcardActionForKey(
  key: string,
): "flip" | FlashcardGrade | null {
  switch (key) {
    case " ":
      return "flip";
    case "ArrowRight":
    case "2":
      return "correct";
    case "ArrowLeft":
    case "1":
      return "wrong";
    default:
      return null;
  }
}
