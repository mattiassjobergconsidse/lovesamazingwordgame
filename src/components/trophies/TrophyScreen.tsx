import { useEffect, useMemo } from "react";
import {
  TROPHY_DEFINITIONS,
  type TrophyDefinition,
  type TrophyId,
} from "../../core/trophyDefinitions";
import { useLibrary } from "../../hooks/useLibrary";
import { useMascotSpeech } from "../../hooks/useMascotSpeech";
import { useI18n } from "../../i18n";
import "../common/common.css";
import { Mascot } from "../common/Mascot";
import "./trophies.css";

type Translate = ReturnType<typeof useI18n>["t"];

/** Describes how to unlock a trophy, from its rule. */
function requirementText(rule: TrophyDefinition["rule"], t: Translate): string {
  switch (rule.kind) {
    case "firstSession":
      return t("trophy.requirement.firstSession");
    case "streak":
      return t("trophy.requirement.streak", { days: rule.days });
    case "mastered":
      return t("trophy.requirement.mastered", { words: rule.words });
    case "perfectWriting":
      return t("trophy.requirement.perfectWriting");
    case "modeSession":
      return t("trophy.requirement.modeSession", {
        mode: t(`route.train.${rule.mode}`),
      });
    case "correctAnswers":
      return t("trophy.requirement.correctAnswers", { count: rule.count });
  }
}

/** All trophies: unlocked ones in colour with their date, locked ones greyed out with their requirement (NH-10). */
export function TrophyScreen() {
  const { t, language } = useI18n();
  const { trophies } = useLibrary();
  const unlockedAt = useMemo(
    () =>
      new Map<TrophyId, number>(
        trophies.map((record) => [record.id, record.unlockedAt]),
      ),
    [trophies],
  );
  const dateFormat = useMemo(
    () => new Intl.DateTimeFormat(language, { dateStyle: "medium" }),
    [language],
  );

  const speech = useMascotSpeech();
  const { say } = speech;

  useEffect(() => {
    say("trophy");
  }, [say]);

  return (
    <div className="trophies-screen">
      <h1 tabIndex={-1}>{t("nav.trophies")}</h1>
      <p className="trophies-summary">
        {t("trophies.summary", {
          unlocked: unlockedAt.size,
          total: TROPHY_DEFINITIONS.length,
        })}
      </p>
      <Mascot speech={speech} />
      <ul className="trophy-grid" aria-label={t("trophies.list")}>
        {TROPHY_DEFINITIONS.map((trophy) => {
          const when = unlockedAt.get(trophy.id);
          const unlocked = when !== undefined;
          return (
            <li
              key={trophy.id}
              className={
                unlocked
                  ? "trophy card trophy-unlocked"
                  : "trophy card trophy-locked"
              }
              data-testid={`trophy-${trophy.id}`}
            >
              <span className="trophy-emoji" aria-hidden="true">
                {unlocked ? trophy.emoji : "🔒"}
              </span>
              <h2 className="trophy-name">{t(`trophy.${trophy.id}.name`)}</h2>
              <p className="trophy-status">
                {unlocked
                  ? t("trophies.unlockedOn", {
                      date: dateFormat.format(when),
                    })
                  : t("trophies.status.locked")}
              </p>
              <p className="trophy-requirement">
                {requirementText(trophy.rule, t)}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
