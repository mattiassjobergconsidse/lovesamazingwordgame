import { useEffect } from "react";
import { isModeAvailable } from "../../core/trainingEligibility";
import { routeToHash, TRAIN_MODES } from "../../router";
import { useActiveSet } from "../../hooks/useActiveSet";
import { useMascotSpeech } from "../../hooks/useMascotSpeech";
import "../common/common.css";
import { Mascot } from "../common/Mascot";
import "../sets/sets.css";
import { useI18n } from "../../i18n";
import { ModeCards } from "./ModeCards";

/** `#/train`: choose a training mode; modes the active set is too small for are disabled (FR-ACT-1). */
export function TrainScreen() {
  const { t } = useI18n();
  const { activeSet, wordCount } = useActiveSet();
  const speech = useMascotSpeech();
  const { say } = speech;

  useEffect(() => {
    say("modeSelect");
  }, [say]);

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
      <Mascot speech={speech} />
      <ModeCards wordCount={wordCount} labelledBy="train-heading" />
      {anyDisabled && (
        <a href={routeToHash({ name: "setEditor", id: activeSet.id })}>
          {t("train.addWords")}
        </a>
      )}
    </>
  );
}
