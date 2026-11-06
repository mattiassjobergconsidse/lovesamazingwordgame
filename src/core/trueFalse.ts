import type { Direction, WordPair } from "../types";
import { termsFor } from "./direction";
import { gradeFromSwipe } from "./flashcardInput";
import { pickDistractors } from "./quiz";
import type { Rng } from "./shuffle";

/** Chance that a proposal shows the real translation (NH-17: about half). */
export const TRUE_PROPOSAL_CHANCE = 0.5;

/** One statement to judge: "`prompt` means `proposed`". */
export interface TrueFalseProposal {
  readonly pairId: string;
  readonly direction: Direction;
  readonly prompt: string;
  /** The translation shown to the user: the real one or a distractor. */
  readonly proposed: string;
  /** Whether `proposed` is a real translation of `prompt`. */
  readonly isTrue: boolean;
  /** The real translation, always available for feedback. */
  readonly correctAnswer: string;
}

/**
 * Builds a proposal that is true about half of the time (NH-17).
 *
 * A false proposal uses a distractor from {@link pickDistractors}, so it never equals the
 * answer or its alternatives. When the pool has no distinct distractor the proposal is true.
 *
 * @param pair The pair being asked.
 * @param pool All pairs of the active set (may include `pair`).
 * @param direction Direction of this card.
 * @param rng Injected random source.
 */
export function buildTrueFalseProposal(
  pair: WordPair,
  pool: readonly WordPair[],
  direction: Direction,
  rng: Rng,
): TrueFalseProposal {
  const { prompt, answer } = termsFor(pair, direction);
  const wantTrue = rng() < TRUE_PROPOSAL_CHANCE;
  const [distractor] = wantTrue
    ? []
    : pickDistractors(pair, pool, direction, 1, rng);
  return {
    pairId: pair.id,
    direction,
    prompt,
    proposed: distractor ?? answer,
    isTrue: distractor === undefined,
    correctAnswer: answer,
  };
}

/** Whether the user judged right: a correct judgement is `correct`, otherwise `wrong`. */
export type TrueFalseResult = "correct" | "wrong";

/**
 * Scores a judgement (NH-17).
 *
 * @param proposal The statement that was shown.
 * @param judgedTrue What the user answered.
 */
export function judgeProposal(
  proposal: TrueFalseProposal,
  judgedTrue: boolean,
): TrueFalseResult {
  return proposal.isTrue === judgedTrue ? "correct" : "wrong";
}

/**
 * Maps a key to a judgement: Left or `1` = true, Right or `2` = false (NH-17).
 *
 * @param key A `KeyboardEvent.key` value.
 * @returns The judgement, or `null` for any other key.
 */
export function judgementForKey(key: string): boolean | null {
  switch (key.toLowerCase()) {
    case "arrowleft":
    case "1":
      return true;
    case "arrowright":
    case "2":
      return false;
    default:
      return null;
  }
}

/**
 * Maps a horizontal swipe to a judgement: left = true, right = false (NH-17).
 *
 * @param deltaX Horizontal movement in pixels; positive is to the right.
 * @param deltaY Vertical movement in pixels.
 * @returns The judgement, or `null` when the movement is too short or too vertical.
 */
export function judgementFromSwipe(
  deltaX: number,
  deltaY: number,
): boolean | null {
  const grade = gradeFromSwipe(deltaX, deltaY);
  return grade === null ? null : grade !== "correct";
}
