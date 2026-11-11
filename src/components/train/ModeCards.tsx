import { useId } from "react";
import { resolveBossPool } from "../../core/bossBattle";
import { UNLOCK_MODES } from "../../core/gameUnlock";
import { isModeAvailable, MIN_WORDS } from "../../core/trainingEligibility";
import { useBossPoolCounts } from "../../hooks/useBossPool";
import { useListeningAvailability } from "../../hooks/useListeningAvailability";
import { useI18n } from "../../i18n";
import { routeToHash, TRAIN_MODES } from "../../router";
import type { WordSet } from "../../types";
import "../common/common.css";
import "../home/home.css";
import { MODE_ICONS } from "./modeIcons";

interface ModeCardsProps {
  /** The active set; its voice languages decide whether Listening is available. */
  readonly set: WordSet;
  /** Number of words in the active set; modes it is too small for are disabled. */
  readonly wordCount: number;
  /** Id of the heading that names the list. */
  readonly labelledBy: string;
}

/** Big cards for the training modes, shared by the home and training screens. */
export function ModeCards({ set, wordCount, labelledBy }: ModeCardsProps) {
  const { t, tp } = useI18n();
  const prefix = useId();
  const listening = useListeningAvailability(set);
  const bossBlocked = resolveBossPool(useBossPoolCounts(set.id)) === null;

  return (
    <ul className="home-modes" aria-labelledby={labelledBy}>
      {TRAIN_MODES.map((mode) => {
        const titleId = `${prefix}-${mode}`;
        const noteId = `${prefix}-${mode}-note`;
        const badgeId = `${prefix}-${mode}-badge`;
        const earnsGame = UNLOCK_MODES.includes(mode);
        const cardLabel = earnsGame ? `${titleId} ${badgeId}` : titleId;
        const tooSmall = !isModeAvailable(mode, wordCount);
        const listeningBlocked =
          mode === "listening" && listening !== "available";
        const needsPool = mode === "boss" && bossBlocked;
        const content = (
          <>
            {earnsGame && (
              <span
                id={badgeId}
                className="home-mode-badge"
                title={t("games.earnBadge")}
              >
                <span aria-hidden="true">🎮</span>
                <span className="home-mode-badge-text">
                  {t("games.earnBadge")}
                </span>
              </span>
            )}{" "}
            <span className="home-mode-icon" aria-hidden="true">
              {MODE_ICONS[mode]}
            </span>
            <span id={titleId} className="home-mode-title">
              {t(`route.train.${mode}`)}
            </span>
            <span className="home-mode-text">{t(`home.mode.${mode}`)}</span>
          </>
        );
        return (
          <li key={mode}>
            {!tooSmall && !listeningBlocked && !needsPool ? (
              <a
                className="home-mode card"
                data-mode={mode}
                aria-labelledby={cardLabel}
                href={routeToHash({ name: "trainMode", mode })}
              >
                {content}
              </a>
            ) : (
              <>
                <button
                  type="button"
                  className="home-mode home-mode-disabled card"
                  data-mode={mode}
                  disabled
                  aria-labelledby={cardLabel}
                  aria-describedby={noteId}
                >
                  {content}
                </button>
                <span id={noteId} className="mode-note">
                  {tooSmall
                    ? tp("train.needs", MIN_WORDS[mode])
                    : needsPool
                      ? t("train.boss.noPool")
                      : listening === "noSpeech"
                        ? t("train.listening.noSpeech")
                        : t("train.listening.noVoice")}
                </span>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
