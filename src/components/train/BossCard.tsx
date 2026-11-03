import { bossQuestionKind } from "../../core/bossBattle";
import { useI18n } from "../../i18n";
import type { ModeCardProps } from "./BasicCard";
import { QuizCard } from "./QuizCard";
import { WritingCard } from "./WritingCard";

/**
 * One question of the Boss Battle (NH-15): a Quiz question the first time and a
 * Writing question when the word comes back after a miss. Both report the answer
 * like in their own modes; the shell turns it into damage or healing.
 */
export function BossCard(props: ModeCardProps) {
  const { t } = useI18n();

  if (bossQuestionKind(props.card.isRepeat) === "quiz") {
    return <QuizCard {...props} />;
  }
  return (
    <>
      <p className="boss-retry">{t("train.boss.retry")}</p>
      <WritingCard {...props} />
    </>
  );
}
