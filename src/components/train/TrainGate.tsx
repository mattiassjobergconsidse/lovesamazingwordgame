import { useState, type ReactNode } from "react";
import { isModeAvailable, MIN_WORDS } from "../../core/trainingEligibility";
import { useActiveSet } from "../../hooks/useActiveSet";
import { useI18n, type MessageKey } from "../../i18n";
import { routeToHash, type TrainMode } from "../../router";
import { SetPickerDialog } from "../sets/SetPickerDialog";

interface TrainGateProps {
  /** Heading shown while the gate blocks the screen. */
  readonly title: MessageKey;
  /** When given, the active set must also have enough words for this mode. */
  readonly mode?: TrainMode;
  readonly children: ReactNode;
}

/**
 * Guards the training screens: without an active set it asks the user to choose
 * one (FR-ACT-1), and for a single mode it also checks the minimum word count.
 */
export function TrainGate({ title, mode, children }: TrainGateProps) {
  const { t, tp } = useI18n();
  const { activeSet, wordCount, ready } = useActiveSet();
  const [pickerOpen, setPickerOpen] = useState(true);

  if (!ready) {
    return children;
  }
  if (activeSet === null) {
    return (
      <>
        <h1 tabIndex={-1}>{t(title)}</h1>
        <p>{t("train.nothingToPractise")}</p>
        <button
          type="button"
          className="button"
          onClick={() => {
            setPickerOpen(true);
          }}
        >
          {t("activeSet.choose")}
        </button>
        {pickerOpen && (
          <SetPickerDialog
            onClose={() => {
              setPickerOpen(false);
            }}
          />
        )}
      </>
    );
  }
  if (mode !== undefined && !isModeAvailable(mode, wordCount)) {
    return (
      <>
        <h1 tabIndex={-1}>{t(title)}</h1>
        <p>{tp("train.needs", MIN_WORDS[mode])}</p>
        <a href={routeToHash({ name: "setEditor", id: activeSet.id })}>
          {t("train.addWords")}
        </a>
      </>
    );
  }
  return children;
}
