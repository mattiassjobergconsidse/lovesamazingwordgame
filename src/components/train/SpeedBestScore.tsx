import { useEffect, useEffectEvent } from "react";
import { isNewBest } from "../../core/speedRound";
import { useBestScore } from "../../hooks/useBestScore";
import { useI18n } from "../../i18n";

interface SpeedBestScoreProps {
  readonly setId: string;
  /** Score of the round that just ended. */
  readonly score: number;
}

/**
 * Best-score lines of a timed Speed Round: celebrates and stores a new best,
 * otherwise shows the score to beat (NH-16). Only mounted for timed rounds, so a
 * practice round never touches storage.
 */
export function SpeedBestScore({ setId, score }: SpeedBestScoreProps) {
  const { t } = useI18n();
  const { status, best, submit } = useBestScore(setId);
  const ready = status === "ready";
  const beatsBest = ready && isNewBest(score, best);
  const save = useEffectEvent(() => {
    submit(score);
  });

  useEffect(() => {
    if (beatsBest) {
      save();
    }
  }, [beatsBest]);

  if (!ready) {
    return null;
  }
  if (beatsBest) {
    return <p role="status">{t("train.speed.newBest")}</p>;
  }
  return (
    <p>
      {best === null
        ? t("train.speed.noBest")
        : t("train.speed.best", { best })}
    </p>
  );
}
