import { useI18n } from "../../i18n";
import type { WordSet } from "../../types";
import { Dialog } from "../common/Dialog";

interface DeleteSetDialogProps {
  readonly set: WordSet;
  readonly wordCount: number;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/** Confirmation naming the set and its word count before an irreversible delete (FR-SET-3). */
export function DeleteSetDialog({
  set,
  wordCount,
  onConfirm,
  onCancel,
}: DeleteSetDialogProps) {
  const { t, tp } = useI18n();

  return (
    <Dialog title={t("sets.delete.title")} onClose={onCancel}>
      <p>
        {t("sets.delete.body", {
          name: set.name,
          words: tp("wordCount", wordCount),
        })}
      </p>
      <div className="dialog-actions">
        <button
          type="button"
          className="button button-danger"
          onClick={onConfirm}
        >
          {t("sets.delete.confirm")}
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
