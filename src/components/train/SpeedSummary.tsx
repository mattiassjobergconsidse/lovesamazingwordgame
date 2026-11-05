import { scoreSpeedRound } from "../../core/speedRound";
import { useI18n } from "../../i18n";
import type { AnswerResult } from "../../types";
import { SpeedBestScore } from "./SpeedBestScore";
interface SpeedSummaryProps {
  readonly setId: string;
  /** Every answer of the finished round. */
  readonly answers: readonly AnswerResult[];
  /** Only timed rounds count towards the best score. */
  readonly timed: boolean;
}
/** Score lines of the Speed Round end screen: this round's score and combo, and the best score (NH-16). */
export function SpeedSummary({ setId, answers, timed }: SpeedSummaryProps) {
  const { t } = useI18n();
  const { correct, score, bestCombo } = scoreSpeedRound(answers);
  return (
    <>
      <p className="session-result-score">
        {t("train.speed.score", { score })}
      </p>
      <p>{t("train.speed.summary", { correct, combo: bestCombo })}</p>
      {timed ? (
        <SpeedBestScore setId={setId} score={score} />
      ) : (
        <p>{t("train.speed.practiceNote")}</p>
      )}
    </>
  );
}
