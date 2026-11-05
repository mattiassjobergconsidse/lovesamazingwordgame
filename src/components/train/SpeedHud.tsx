import { useCallback, useEffect, useEffectEvent, useState } from "react";
import {
  comboMultiplier,
  remainingMs,
  scoreSpeedRound,
} from "../../core/speedRound";
import { useInterval } from "../../hooks/useInterval";
import { useI18n } from "../../i18n";
import type { AnswerResult } from "../../types";

/** How often the countdown refreshes; coarse enough to be cheap, fine enough to feel live. */
const TICK_MS = 250;

interface SpeedHudProps {
  /** Epoch ms when the round started; the countdown is measured from it. */
  readonly startedAt: number;
  /** False for the no-timer practice variant. */
  readonly timed: boolean;
  /** Every answer of the round so far, for score and combo. */
  readonly answers: readonly AnswerResult[];
  /** Called once the time has run out. */
  readonly onTimeUp: () => void;
}

/**
 * Score, combo and countdown of a Speed Round (NH-16). The numbers carry the
 * information; there is deliberately no animated bar, so reduced-motion users
 * lose nothing.
 */
export function SpeedHud({
  startedAt,
  timed,
  answers,
  onTimeUp,
}: SpeedHudProps) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  const tick = useCallback(() => {
    setNow(Date.now());
  }, []);
  useInterval(tick, TICK_MS, timed);

  const left = timed ? remainingMs(startedAt, now) : null;
  const timeUp = useEffectEvent(onTimeUp);
  useEffect(() => {
    if (left === 0) {
      timeUp();
    }
  }, [left]);

  const { score, combo } = scoreSpeedRound(answers);
  const multiplier = comboMultiplier(combo);

  return (
    <section className="speed-hud" aria-label={t("train.speed.hud")}>
      {left !== null && (
        <p
          className="speed-time"
          role="timer"
          aria-label={t("train.speed.time")}
        >
          {t("train.speed.timeLeft", { seconds: Math.ceil(left / 1000) })}
        </p>
      )}
      <p className="speed-score">{t("train.speed.score", { score })}</p>
      <p className="speed-combo">
        {t("train.speed.combo", { multiplier, combo })}
      </p>
    </section>
  );
}
