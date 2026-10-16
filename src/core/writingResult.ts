import type { AnswerResult } from "../types";

/**
 * Final result of a Writing card once hints are taken into account (FR-WR-4).
 *
 * A correct answer that needed a hint is only `assisted`; hints never soften a
 * wrong or already-assisted answer.
 *
 * @param checked Result of `checkAnswer`.
 * @param usedHint Whether the user revealed at least one hint letter.
 */
export function resolveWritingResult(
  checked: AnswerResult,
  usedHint: boolean,
): AnswerResult {
  return checked === "correct" && usedHint ? "assisted" : checked;
}
