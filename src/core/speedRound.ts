import type { AnswerResult } from "../types";

/** Length of a timed Speed Round (NH-16). */
export const SPEED_ROUND_MS = 60_000;
/** Points of a correct answer before the combo multiplier. */
export const POINTS_PER_CORRECT = 10;
/** Consecutive correct answers needed to raise the multiplier by one. */
export const COMBO_STEP = 3;
/** The multiplier never grows beyond this. */
export const MAX_MULTIPLIER = 5;

/** The best timed score of one set, as stored (one record per set). */
export interface BestScoreRecord {
  readonly setId: string;
  readonly score: number;
  /** Epoch ms when the score was reached. */
  readonly achievedAt: number;
}

/** Score facts of a Speed Round, derived from its answers. */
export interface SpeedScore {
  readonly score: number;
  /** Current run of correct answers. */
  readonly combo: number;
  /** Longest run of correct answers. */
  readonly bestCombo: number;
  readonly correct: number;
}

/**
 * Score multiplier earned by a run of correct answers: x1 up to
 * {@link COMBO_STEP} - 1, then one more for every {@link COMBO_STEP}.
 *
 * @param combo Consecutive correct answers so far.
 */
export function comboMultiplier(combo: number): number {
  return Math.min(
    1 + Math.floor(Math.max(0, combo) / COMBO_STEP),
    MAX_MULTIPLIER,
  );
}

/**
 * Scores the answers of a round in order. A correct answer earns points times
 * the multiplier of the run so far; any other answer resets the combo.
 *
 * @param answers Every answer of the round, repeats included.
 */
export function scoreSpeedRound(answers: readonly AnswerResult[]): SpeedScore {
  let score = 0;
  let combo = 0;
  let bestCombo = 0;
  let correct = 0;
  for (const result of answers) {
    if (result === "correct") {
      score += POINTS_PER_CORRECT * comboMultiplier(combo);
      combo += 1;
      correct += 1;
      bestCombo = Math.max(bestCombo, combo);
    } else {
      combo = 0;
    }
  }
  return { score, combo, bestCombo, correct };
}

/**
 * Time left in a timed round. Both times are passed in, so the clock stays
 * outside `core/` (FR-TEST-5).
 *
 * @param startedAt Epoch ms when the round started.
 * @param now Epoch ms now.
 * @returns Milliseconds left, never below zero.
 */
export function remainingMs(startedAt: number, now: number): number {
  return Math.max(0, SPEED_ROUND_MS - (now - startedAt));
}

/**
 * Whether a score beats the stored best score of a set.
 *
 * @param score Score of the round that just ended.
 * @param best Stored best score, or `null` when there is none.
 * @returns True for a first positive score or a higher one; a score of 0 is never a best.
 */
export function isNewBest(score: number, best: number | null): boolean {
  return score > 0 && (best === null || score > best);
}
