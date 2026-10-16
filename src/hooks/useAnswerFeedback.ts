import { useCallback } from "react";
import { summariseResults } from "../core/feedback";
import { playAnswerSound, vibrateForAnswer } from "../storage/feedback";
import type { AnswerResult } from "../types";
import { useSettings } from "./useSettings";

/**
 * Gives the answer feedback the user has switched on (NH-4): a tone and/or a vibration.
 *
 * @returns A function taking one result, or all results of a Matching round.
 */
export function useAnswerFeedback(): (
  results: AnswerResult | Iterable<AnswerResult>,
) => void {
  const { settings } = useSettings();
  const { soundEnabled, hapticsEnabled } = settings;
  return useCallback(
    (results) => {
      const result =
        typeof results === "string" ? results : summariseResults(results);
      if (soundEnabled) {
        playAnswerSound(result);
      }
      if (hapticsEnabled) {
        vibrateForAnswer(result);
      }
    },
    [soundEnabled, hapticsEnabled],
  );
}
