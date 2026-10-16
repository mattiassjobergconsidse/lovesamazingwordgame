import type { AnswerResult } from "../types";

/** A tone: frequency in hertz and length in seconds. */
export interface Tone {
  readonly frequency: number;
  readonly duration: number;
}

/** Tones played after an answer (NH-4): high and short for correct, low and long for wrong. */
export const TONES: Readonly<Record<AnswerResult, Tone>> = {
  correct: { frequency: 880, duration: 0.12 },
  assisted: { frequency: 520, duration: 0.14 },
  wrong: { frequency: 220, duration: 0.25 },
};

/** Vibration patterns in milliseconds (vibrate, pause, vibrate, ...). */
export const VIBRATIONS: Readonly<Record<AnswerResult, readonly number[]>> = {
  correct: [30],
  assisted: [40],
  wrong: [60, 40, 60],
};

/**
 * Reduces the results of a whole Matching round to one feedback result:
 * wrong beats assisted beats correct.
 *
 * @param results The round's results.
 */
export function summariseResults(
  results: Iterable<AnswerResult>,
): AnswerResult {
  let summary: AnswerResult = "correct";
  for (const result of results) {
    if (result === "wrong") {
      return "wrong";
    }
    if (result === "assisted") {
      summary = "assisted";
    }
  }
  return summary;
}
