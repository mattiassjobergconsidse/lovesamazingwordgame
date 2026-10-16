import { useState } from "react";
import type { ConflictChoice, ImportConflict } from "../../core/importPlan";
import { useI18n } from "../../i18n";
import { Dialog } from "../common/Dialog";
import "./data.css";

interface ImportConflictDialogProps {
  readonly conflicts: readonly ImportConflict[];
  readonly onConfirm: (choices: ReadonlyMap<string, ConflictChoice>) => void;
  readonly onCancel: () => void;
}

const CHOICES = ["rename", "replace", "skip"] as const;

/** Asks per conflicting set whether to rename, replace or skip it (FR-IO-2). */
export function ImportConflictDialog({
  conflicts,
  onConfirm,
  onCancel,
}: ImportConflictDialogProps) {
  const { t } = useI18n();
  const [choices, setChoices] = useState<ReadonlyMap<string, ConflictChoice>>(
    () => new Map(),
  );

  return (
    <Dialog title={t("data.conflict.title")} onClose={onCancel}>
      <p>{t("data.conflict.body")}</p>
      {conflicts.map((conflict) => (
        <fieldset key={conflict.incomingId} className="conflict-group">
          <legend>{conflict.name}</legend>
          {CHOICES.map((choice) => (
            <label key={choice} className="check-field">
              <input
                type="radio"
                name={`conflict-${conflict.incomingId}`}
                checked={
                  (choices.get(conflict.incomingId) ?? "rename") === choice
                }
                onChange={() => {
                  setChoices(new Map(choices).set(conflict.incomingId, choice));
                }}
              />
              {t(`data.conflict.${choice}`)}
            </label>
          ))}
        </fieldset>
      ))}
      <div className="dialog-actions">
        <button
          type="button"
          className="button"
          onClick={() => {
            onConfirm(choices);
          }}
        >
          {t("data.conflict.confirm")}
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={onCancel}
        >
          {t("common.cancel")}
        </button>
      </div>
    </Dialog>
  );
}
