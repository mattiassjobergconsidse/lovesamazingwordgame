import type { AnswerResult, WordPair } from "../types";
import { shuffle, type Rng } from "./shuffle";

/** Maximum pairs per round (FR-MT-1). */
export const MAX_PAIRS_PER_ROUND = 6;

/**
 * Splits session words into rounds (FR-MT-3, FR-MT-4).
 *
 * Rounds hold up to 6 pairs in the given order. A single leftover pair joins the
 * previous round (max 7) instead of forming a round of its own.
 *
 * @param pairs Session words in session order.
 */
export function buildMatchingRounds(pairs: readonly WordPair[]): WordPair[][] {
  const rounds: WordPair[][] = [];
  for (let start = 0; start < pairs.length; start += MAX_PAIRS_PER_ROUND) {
    rounds.push(pairs.slice(start, start + MAX_PAIRS_PER_ROUND));
  }
  const last = rounds.at(-1);
  const previous = rounds.at(-2);
  if (last?.length === 1 && previous !== undefined) {
    rounds.splice(-2, 2, [...previous, ...last]);
  }
  return rounds;
}

/** One tappable item in a matching column. */
export interface MatchItem {
  readonly pairId: string;
  readonly text: string;
}

/** Both columns of a round, each shuffled independently. */
export interface MatchingRound {
  readonly left: readonly MatchItem[];
  readonly right: readonly MatchItem[];
  /** True when language B is on the left (random column order per round, FR-MT-1). */
  readonly swapped: boolean;
}

/**
 * Builds the two shuffled columns of a round.
 *
 * @param pairs Pairs of this round.
 * @param rng Injected random source.
 */
export function buildMatchingRound(
  pairs: readonly WordPair[],
  rng: Rng,
): MatchingRound {
  const swapped = rng() < 0.5;
  const aItems = pairs.map((pair) => ({ pairId: pair.id, text: pair.a }));
  const bItems = pairs.map((pair) => ({ pairId: pair.id, text: pair.b }));
  return {
    left: shuffle(swapped ? bItems : aItems, rng),
    right: shuffle(swapped ? aItems : bItems, rng),
    swapped,
  };
}

/** Result of one tap-pair attempt. */
export interface MatchAttempt {
  readonly isMatch: boolean;
  /** First-attempt results so far; only the first attempt per word counts (FR-MT-3). */
  readonly results: ReadonlyMap<string, AnswerResult>;
}

/**
 * Evaluates a selected left/right item pair and records first-attempt results.
 *
 * A correct match records `correct` for the word unless it already has a result.
 * A wrong attempt records `wrong` for both words involved, unless they already have one.
 *
 * @param left Selected item of the left column.
 * @param right Selected item of the right column.
 * @param results First-attempt results before this attempt.
 */
export function attemptMatch(
  left: MatchItem,
  right: MatchItem,
  results: ReadonlyMap<string, AnswerResult>,
): MatchAttempt {
  const next = new Map(results);
  const record = (pairId: string, result: AnswerResult): void => {
    if (!next.has(pairId)) {
      next.set(pairId, result);
    }
  };
  const isMatch = left.pairId === right.pairId;
  if (isMatch) {
    record(left.pairId, "correct");
  } else {
    record(left.pairId, "wrong");
    record(right.pairId, "wrong");
  }
  return { isMatch, results: next };
}
