import type { Direction, DirectionMode, WordPair } from "../types";
import type { Rng } from "./shuffle";

/**
 * Chooses the direction for one card (FR-TRN-3).
 *
 * @param mode `random` picks per call; `AtoB` / `BtoA` force a direction.
 * @param rng Injected random source.
 */
export function pickDirection(mode: DirectionMode, rng: Rng): Direction {
  if (mode !== "random") {
    return mode;
  }
  return rng() < 0.5 ? "AtoB" : "BtoA";
}

/** The prompt and answer sides of a pair for one direction. */
export interface CardTerms {
  readonly prompt: string;
  readonly answer: string;
  /** Alternatives accepted for the answer side (FR-SET-7). */
  readonly alternatives: readonly string[];
}

/**
 * Resolves which side of `pair` is the prompt and which is the answer.
 *
 * @param pair The word pair.
 * @param direction `AtoB` prompts with `a` and expects `b`; `BtoA` is the reverse.
 */
export function termsFor(pair: WordPair, direction: Direction): CardTerms {
  if (direction === "AtoB") {
    return { prompt: pair.a, answer: pair.b, alternatives: pair.altB ?? [] };
  }
  return { prompt: pair.b, answer: pair.a, alternatives: pair.altA ?? [] };
}

/** The main answer followed by its alternatives; the first entry is the main term. */
export function acceptedAnswers(terms: CardTerms): readonly string[] {
  return [terms.answer, ...terms.alternatives];
}
