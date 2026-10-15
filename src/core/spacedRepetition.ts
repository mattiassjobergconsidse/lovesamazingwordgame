import type { AnswerResult, Box, WordPair, WordProgress } from "../types";

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** Time until a word in each box is due again (SPEC section 7). Tune intervals here only. */
export const INTERVALS_MS: Readonly<Record<Box, number>> = {
  0: 0,
  1: 10 * MINUTE_MS,
  2: DAY_MS,
  3: 3 * DAY_MS,
  4: 7 * DAY_MS,
  5: 21 * DAY_MS,
};

const PROMOTED: Readonly<Record<Box, Box>> = {
  0: 1,
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 5,
};
/** Wrong answers drop two boxes but never below box 1. */
const DEMOTED: Readonly<Record<Box, Box>> = {
  0: 1,
  1: 1,
  2: 1,
  3: 1,
  4: 2,
  5: 3,
};
/** Assisted answers keep the box, except that new words enter box 1. */
const ASSISTED: Readonly<Record<Box, Box>> = {
  0: 1,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
};

/**
 * Creates the initial (new, box 0) progress for a word without a record.
 *
 * @param pair Pair to track.
 */
export function createProgress(
  pair: Pick<WordPair, "id" | "setId">,
): WordProgress {
  return {
    pairId: pair.id,
    setId: pair.setId,
    box: 0,
    dueAt: 0,
    correct: 0,
    wrong: 0,
    lastSeenAt: null,
    streak: 0,
  };
}

/**
 * Applies one answer to a word's progress (SPEC section 7).
 *
 * `assisted` changes neither lifetime counter: it is not a clean success, and the word is not
 * treated as a failure for the hardest-words list.
 *
 * @param progress Current progress.
 * @param result Outcome of the first answer to the word in a session.
 * @param now Epoch ms of the answer.
 * @returns A new progress record; the input is not mutated.
 */
export function applyResult(
  progress: WordProgress,
  result: AnswerResult,
  now: number,
): WordProgress {
  const box = nextBox(progress.box, result);
  return {
    ...progress,
    box,
    dueAt: now + INTERVALS_MS[box],
    correct: progress.correct + (result === "correct" ? 1 : 0),
    wrong: progress.wrong + (result === "wrong" ? 1 : 0),
    lastSeenAt: now,
    streak: result === "correct" ? progress.streak + 1 : 0,
  };
}

function nextBox(box: Box, result: AnswerResult): Box {
  switch (result) {
    case "correct":
      return PROMOTED[box];
    case "wrong":
      return DEMOTED[box];
    case "assisted":
      return ASSISTED[box];
    default: {
      const unreachable: never = result;
      return unreachable;
    }
  }
}

/** Whether a word has been seen and is due at `now` (new words are not "due", they are new). */
export function isDue(progress: WordProgress, now: number): boolean {
  return progress.box > 0 && progress.dueAt <= now;
}

/**
 * Counts words that are due at `now`.
 *
 * @param progress Progress records of one set.
 * @param now Epoch ms.
 */
export function countDue(
  progress: Iterable<WordProgress>,
  now: number,
): number {
  let count = 0;
  for (const item of progress) {
    if (isDue(item, now)) {
      count += 1;
    }
  }
  return count;
}
