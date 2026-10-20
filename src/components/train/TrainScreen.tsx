import { isModeAvailable } from "../../core/trainingEligibility";
import { routeToHash, TRAIN_MODES } from "../../router";
import { useActiveSet } from "../../hooks/useActiveSet";
import "../common/common.css";
import "../sets/sets.css";
import { useI18n } from "../../i18n";
import { ModeCards } from "./ModeCards";

/** `#/train`: choose a training mode; modes the active set is too small for are disabled (FR-ACT-1). */
export function TrainScreen() {
  const { t } = useI18n();
  const { activeSet, wordCount } = useActiveSet();

  if (activeSet === null) {
    return <h1 tabIndex={-1}>{t("nav.train")}</h1>;
  }
  const anyDisabled = TRAIN_MODES.some(
    (mode) => !isModeAvailable(mode, wordCount),
  );

  return (
    <>
      <h1 id="train-heading" tabIndex={-1}>
        {t("nav.train")}
      </h1>
      <ModeCards wordCount={wordCount} labelledBy="train-heading" />
      {anyDisabled && (
        <a href={routeToHash({ name: "setEditor", id: activeSet.id })}>
          {t("train.addWords")}
        </a>
      )}
    </>
  );
}
