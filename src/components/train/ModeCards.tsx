import { useId } from "react";
import { isModeAvailable, MIN_WORDS } from "../../core/trainingEligibility";
import { useI18n } from "../../i18n";
import { routeToHash, TRAIN_MODES } from "../../router";
import "../common/common.css";
import "../home/home.css";
import { MODE_ICONS } from "./modeIcons";

interface ModeCardsProps {
  /** Number of words in the active set; modes it is too small for are disabled. */
  readonly wordCount: number;
  /** Id of the heading that names the list. */
  readonly labelledBy: string;
}

/** Big cards for the four training modes, shared by the home and training screens. */
export function ModeCards({ wordCount, labelledBy }: ModeCardsProps) {
  const { t, tp } = useI18n();
  const prefix = useId();

  return (
    <ul className="home-modes" aria-labelledby={labelledBy}>
      {TRAIN_MODES.map((mode) => {
        const titleId = `${prefix}-${mode}`;
        const noteId = `${prefix}-${mode}-note`;
        const content = (
          <>
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
            {isModeAvailable(mode, wordCount) ? (
              <a
                className="home-mode card"
                data-mode={mode}
                aria-labelledby={titleId}
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
                  aria-labelledby={titleId}
                  aria-describedby={noteId}
                >
                  {content}
                </button>
                <span id={noteId} className="mode-note">
                  {tp("train.needs", MIN_WORDS[mode])}
                </span>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
