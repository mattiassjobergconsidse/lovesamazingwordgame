import { useEffect } from "react";
import { isPerfectSession } from "../core/trophies";
import { TROPHY_DEFINITIONS } from "../core/trophyDefinitions";
import { useI18n } from "../i18n";
import type { TrainMode } from "../router";
import type { TrainingView } from "./useTrainingSession";
import { useLibrary } from "./useLibrary";
import { useToast } from "./useToast";

const CELEBRATION_MS = 6000;

/**
 * Checks the trophy rules once when a training session finishes and celebrates
 * new unlocks with a toast (NH-10).
 *
 * @param view The training view; only the `finished` state triggers a check.
 * @param mode The mode being practised.
 * @throws If used outside the library, toast and i18n providers.
 */
export function useTrophyCelebration(
  view: TrainingView,
  mode: TrainMode,
): void {
  const { completeSession } = useLibrary();
  const { showToast } = useToast();
  const { t } = useI18n();
  const finishedSession = view.status === "finished" ? view.session : null;

  useEffect(() => {
    if (finishedSession === null) {
      return;
    }
    const unlocked = completeSession(
      { mode, perfect: isPerfectSession(finishedSession) },
      Date.now(),
    );
    if (unlocked.length === 0) {
      return;
    }
    const names = TROPHY_DEFINITIONS.filter(({ id }) =>
      unlocked.includes(id),
    ).map(({ id, emoji }) => `${emoji} ${t(`trophy.${id}.name`)}`);
    showToast({
      message: t(
        names.length === 1 ? "trophy.toast.single" : "trophy.toast.multiple",
        { names: names.join(", ") },
      ),
      celebrate: true,
      durationMs: CELEBRATION_MS,
    });
  }, [finishedSession, completeSession, mode, showToast, t]);
}
