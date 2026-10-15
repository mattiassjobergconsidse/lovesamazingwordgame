import { isModeAvailable, MIN_WORDS } from "../../core/trainingEligibility";
import { useActiveSet } from "../../hooks/useActiveSet";
import "../common/common.css";
import "../sets/sets.css";
import { useI18n } from "../../i18n";
import { routeToHash, TRAIN_MODES } from "../../router";

/** `#/train`: choose a training mode; modes the active set is too small for are disabled (FR-ACT-1). */
export function TrainScreen() {
  const { t, tp } = useI18n();
  const { activeSet, wordCount } = useActiveSet();

  if (activeSet === null) {
    return <h1 tabIndex={-1}>{t("nav.train")}</h1>;
  }
  const anyDisabled = TRAIN_MODES.some(
    (mode) => !isModeAvailable(mode, wordCount),
  );

  return (
    <>
      <h1 tabIndex={-1}>{t("nav.train")}</h1>
      <ul className="mode-list">
        {TRAIN_MODES.map((mode) => {
          const available = isModeAvailable(mode, wordCount);
          const noteId = `mode-note-${mode}`;
          return (
            <li key={mode}>
              {available ? (
                <a
                  className="button button-link"
                  href={routeToHash({ name: "trainMode", mode })}
                >
                  {t(`route.train.${mode}`)}
                </a>
              ) : (
                <>
                  <button
                    type="button"
                    className="button"
                    disabled
                    aria-describedby={noteId}
                  >
                    {t(`route.train.${mode}`)}
                  </button>
                  <p id={noteId} className="mode-note">
                    {tp("train.needs", MIN_WORDS[mode])}
                  </p>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {anyDisabled && (
        <a href={routeToHash({ name: "setEditor", id: activeSet.id })}>
          {t("train.addWords")}
        </a>
      )}
    </>
  );
}
