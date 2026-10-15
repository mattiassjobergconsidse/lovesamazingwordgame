/** The four training modes. Kept here so `core/` does not depend on the router. */
export type EligibilityMode = "flashcards" | "quiz" | "matching" | "writing";

/** Minimum number of word pairs per mode (FR-ACT-1, FR-QZ-3, FR-MT-4). */
export const MIN_WORDS: Readonly<Record<EligibilityMode, number>> = {
  flashcards: 1,
  writing: 1,
  quiz: 2,
  matching: 2,
};

/**
 * Whether a set with `wordCount` pairs can be practised in `mode` (FR-ACT-1).
 *
 * @param mode The training mode.
 * @param wordCount Number of pairs in the active set.
 */
export function isModeAvailable(
  mode: EligibilityMode,
  wordCount: number,
): boolean {
  return wordCount >= MIN_WORDS[mode];
}
