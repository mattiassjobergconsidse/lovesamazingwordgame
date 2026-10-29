import { useEffect } from "react";
import { earnsGameUnlock, grantUnlock } from "../core/gameUnlock";
import { isPerfectSession } from "../core/trophies";
import type { TrainMode } from "../router";
import { saveGameUnlock } from "../storage/gameUnlockStore";
import type { TrainingView } from "./useTrainingSession";

/**
 * Stores a mini-game play when a perfect Writing session finishes (NH-11).
 *
 * @param view The training view; only the `finished` state counts.
 * @param mode The mode being practised.
 * @returns Whether this session earned a play, so the end screen can offer it.
 */
export function useGameUnlockOffer(
  view: TrainingView,
  mode: TrainMode,
): boolean {
  const finishedSession = view.status === "finished" ? view.session : null;
  const overrides = view.status === "finished" ? view.overrides : 0;
  const earned =
    finishedSession !== null &&
    earnsGameUnlock({
      mode,
      perfect: isPerfectSession(finishedSession),
      overrides,
      total: finishedSession.total,
    });

  useEffect(() => {
    if (earned) {
      // A new perfect session replaces an unused play, so unlocks never stack.
      saveGameUnlock(grantUnlock(Date.now()));
    }
  }, [earned, finishedSession]);

  return earned;
}
