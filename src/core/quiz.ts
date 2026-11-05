import type { Direction, WordPair } from "../types";
import { normalizeAnswer } from "./checkAnswer";
import { acceptedAnswers, termsFor } from "./direction";
import { shuffle, type Rng } from "./shuffle";

/** Number of options shown when the set is large enough (FR-QZ-1). */
export const QUIZ_OPTION_COUNT = 4;

/** One multiple-choice question. */
export interface QuizQuestion {
  readonly pairId: string;
  readonly direction: Direction;
  readonly prompt: string;
  /** Shuffled answer texts; contains the correct answer exactly once. */
  readonly options: readonly string[];
  readonly correctIndex: number;
}

/**
 * Picks wrong answers from other pairs of the pool (FR-QZ-1, NH-17).
 *
 * They are unique (after normalisation) and never equal the correct answer or its alternatives.
 *
 * @param pair The pair being asked.
 * @param pool All pairs of the active set (may include `pair`).
 * @param direction Direction of this card.
 * @param count Maximum number of distractors wanted.
 * @param rng Injected random source.
 * @returns Up to `count` answer texts; fewer when the pool has too few distinct ones.
 */
export function pickDistractors(
  pair: WordPair,
  pool: readonly WordPair[],
  direction: Direction,
  count: number,
  rng: Rng,
): string[] {
  const taken = new Set(
    acceptedAnswers(termsFor(pair, direction)).map(normalizeAnswer),
  );
  const distractors: string[] = [];
  for (const other of shuffle(pool, rng)) {
    if (distractors.length >= count) {
      break;
    }
    if (other.id === pair.id) {
      continue;
    }
    const { answer } = termsFor(other, direction);
    const key = normalizeAnswer(answer);
    if (!taken.has(key)) {
      taken.add(key);
      distractors.push(answer);
    }
  }
  return distractors;
}

/**
 * Builds a question with distractors taken from other pairs (FR-QZ-1, FR-QZ-3).
 *
 * Distractors are unique (after normalisation) and never equal the correct answer or its
 * alternatives. When the pool offers fewer distinct distractors, fewer options are returned.
 *
 * @param pair The pair being asked.
 * @param pool All pairs of the active set (may include `pair`).
 * @param direction Direction of this card.
 * @param rng Injected random source.
 */
export function buildQuizQuestion(
  pair: WordPair,
  pool: readonly WordPair[],
  direction: Direction,
  rng: Rng,
): QuizQuestion {
  const terms = termsFor(pair, direction);
  const distractors = pickDistractors(
    pair,
    pool,
    direction,
    QUIZ_OPTION_COUNT - 1,
    rng,
  );

  const options = shuffle([terms.answer, ...distractors], rng);
  return {
    pairId: pair.id,
    direction,
    prompt: terms.prompt,
    options,
    correctIndex: options.indexOf(terms.answer),
  };
}
