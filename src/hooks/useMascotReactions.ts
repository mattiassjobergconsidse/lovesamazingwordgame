import { useCallback, useRef } from "react";
import { summariseResults } from "../core/feedback";
import { reactToAnswer } from "../core/mascotPhrases";
import type { AnswerResult } from "../types";
import type { MascotSpeech } from "./useMascotSpeech";

/**
 * Lets the mascot react to answers (NH-12) and keeps track of the streak of
 * correct answers within one session.
 *
 * @param speech The mascot's speech bubble.
 * @returns A function taking one result, or all results of a Matching round.
 */
export function useMascotReactions(
  speech: MascotSpeech,
): (results: AnswerResult | Iterable<AnswerResult>) => void {
  const { say } = speech;
  const streak = useRef(0);
  return useCallback(
    (results) => {
      const result =
        typeof results === "string" ? results : summariseResults(results);
      const reaction = reactToAnswer(streak.current, result);
      streak.current = reaction.streak;
      if (reaction.event !== null) {
        say(reaction.event);
      }
    },
    [say],
  );
}
