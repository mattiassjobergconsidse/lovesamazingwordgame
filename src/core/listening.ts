import type { AnswerResult, DirectionMode, WordSet } from "../types";
import { resolveWritingResult } from "./writingResult";

/** Why Listening mode can or cannot be used (NH-14). */
export type ListeningAvailability = "available" | "noSpeech" | "noVoice";

/**
 * Whether Listening mode can speak every card of a set.
 *
 * The spoken term is the prompt side and the user answers with its translation,
 * so each direction that can occur needs a voice language on the prompt side:
 * `AtoB` needs A, `BtoA` needs B, `random` both.
 *
 * @param set The set's voice language tags.
 * @param directionMode The direction setting (FR-TRN-3).
 * @param speechSupported Whether the browser can read text aloud.
 */
export function listeningAvailability(
  set: Pick<WordSet, "langACode" | "langBCode">,
  directionMode: DirectionMode,
  speechSupported: boolean,
): ListeningAvailability {
  if (!speechSupported) {
    return "noSpeech";
  }
  const hasA = set.langACode !== undefined;
  const hasB = set.langBCode !== undefined;
  const ready =
    directionMode === "AtoB"
      ? hasA
      : directionMode === "BtoA"
        ? hasB
        : hasA && hasB;
  return ready ? "available" : "noVoice";
}

/**
 * Final result of a Listening card (NH-14). Hearing the word again or revealing
 * its text only softens a correct answer to `assisted`; it never rescues a wrong one.
 *
 * @param checked `correct` or `wrong` for a choice, the `checkAnswer` result for typing.
 * @param usedHelp Whether the user replayed the audio or revealed the text.
 */
export function resolveListeningResult(
  checked: AnswerResult,
  usedHelp: boolean,
): AnswerResult {
  return resolveWritingResult(checked, usedHelp);
}

/** Which feedback a finished Listening card shows. */
export type ListeningFeedback =
  "correct" | "correctWithHelp" | "almost" | "wrong";

/**
 * Picks the feedback for a finished card.
 *
 * @param checked The plain check, before help is considered.
 * @param result The final result from {@link resolveListeningResult}.
 */
export function listeningFeedback(
  checked: AnswerResult,
  result: AnswerResult,
): ListeningFeedback {
  if (checked === "wrong") {
    return "wrong";
  }
  if (checked === "assisted") {
    return "almost";
  }
  return result === "assisted" ? "correctWithHelp" : "correct";
}
